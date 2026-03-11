from __future__ import annotations

import argparse
import base64
from pathlib import Path
from typing import Literal

import cv2
import numpy as np


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create transparent logo crops and lossless SVG wrappers from a logo sheet image.",
    )
    parser.add_argument("--input", required=True, help="Path to source image (PNG/JPG).")
    parser.add_argument(
        "--output-dir",
        default="public/images",
        help="Directory where cropped PNGs and lossless SVGs are written.",
    )
    parser.add_argument(
        "--prefix",
        default="logo",
        help="Filename prefix for generated files.",
    )
    parser.add_argument(
        "--pad",
        type=int,
        default=10,
        help="Padding (pixels) around each detected logo bounding box.",
    )
    parser.add_argument(
        "--min-area",
        type=int,
        default=2000,
        help="Minimum connected-component area to treat as a logo.",
    )
    parser.add_argument(
        "--square-size",
        type=int,
        default=512,
        help="Output square canvas size. Set to 0 to keep tight crop dimensions.",
    )
    parser.add_argument(
        "--background-color",
        default="transparent",
        help='Canvas background color as "transparent", "auto", or hex like "#000000".',
    )
    parser.add_argument(
        "--content-inset",
        type=int,
        default=0,
        help="Inset (pixels) to keep around the scaled logo content inside the square canvas.",
    )
    parser.add_argument(
        "--corner-radius",
        type=int,
        default=64,
        help="Corner radius (pixels) applied to final square output. Set 0 for sharp corners.",
    )
    parser.add_argument(
        "--mode",
        choices=["lossless", "vector", "both"],
        default="lossless",
        help="Output mode: lossless raster-in-SVG, vector approximation, or both.",
    )
    parser.add_argument(
        "--extraction",
        choices=["components", "quadrants"],
        default="components",
        help="Logo extraction strategy: connected components or one logo per image quadrant.",
    )
    parser.add_argument(
        "--vector-colors",
        type=int,
        default=18,
        help="Target color count for vector approximation mode.",
    )
    parser.add_argument(
        "--vector-seam-stroke",
        type=float,
        default=0.55,
        help="Fill-matched stroke width used to hide anti-alias seams in vector mode (0 to disable).",
    )
    parser.add_argument(
        "--vector-preblur",
        type=float,
        default=1.2,
        help="Gaussian blur sigma before quantization in vector mode.",
    )
    parser.add_argument(
        "--vector-feather",
        type=float,
        default=0.55,
        help="SVG gaussian blur (stdDeviation) applied to vector layers for smoother gradients (0 to disable).",
    )
    parser.add_argument(
        "--vector-simplify",
        type=float,
        default=0.003,
        help="Contour simplification factor in vector mode (higher = fewer points/lines).",
    )
    parser.add_argument(
        "--vector-monochrome",
        action="store_true",
        help="Generate vector output in monochrome (single fill color, no gradient-like color regions).",
    )
    parser.add_argument(
        "--vector-mono-fill",
        default="#000000",
        help="Monochrome fill color for vector mode (hex #RRGGBB).",
    )
    parser.add_argument(
        "--vector-background",
        default="transparent",
        help='Vector background: "transparent", "auto", or hex like "#000000".',
    )
    return parser.parse_args()


def parse_vector_background(raw: str) -> Literal["transparent", "auto"] | str:
    value = raw.strip().lower()
    if value in {"transparent", "auto"}:
        return value
    if value.startswith("#") and len(value) == 7:
        return value
    raise SystemExit('Invalid --vector-background value. Use "transparent", "auto", or "#RRGGBB".')


def to_bgr_alpha(image: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if image.shape[2] == 4:
        return image[:, :, :3], image[:, :, 3]
    return image[:, :, :3], np.full(image.shape[:2], 255, dtype=np.uint8)


def detect_components(
    bgr: np.ndarray,
    alpha: np.ndarray,
    min_area: int,
) -> tuple[np.ndarray, list[dict[str, int | float]]]:
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    fg = ((gray > 8) & (alpha > 8)).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(fg, connectivity=8)

    components: list[dict[str, int | float]] = []
    for label in range(1, num_labels):
        x, y, w, h, area = stats[label]
        if area < min_area:
            continue
        cx, cy = centroids[label]
        components.append(
            {
                "label": int(label),
                "x": int(x),
                "y": int(y),
                "w": int(w),
                "h": int(h),
                "area": int(area),
                "cx": float(cx),
                "cy": float(cy),
            },
        )
    return labels, components


def detect_quadrant_components(
    bgr: np.ndarray,
    alpha: np.ndarray,
    pad: int,
) -> list[dict[str, int | float]]:
    height, width = bgr.shape[:2]
    quadrants = [
        ("top-left", 0, height // 2, 0, width // 2),
        ("top-right", 0, height // 2, width // 2, width),
        ("bottom-left", height // 2, height, 0, width // 2),
        ("bottom-right", height // 2, height, width // 2, width),
    ]

    components: list[dict[str, int | float]] = []
    for idx, (name, y0, y1, x0, x1) in enumerate(quadrants, start=1):
        q_alpha = alpha[y0:y1, x0:x1]
        ys, xs = np.where(q_alpha > 8)

        if len(xs) == 0:
            q_bgr = bgr[y0:y1, x0:x1]
            q_gray = cv2.cvtColor(q_bgr, cv2.COLOR_BGR2GRAY)
            fallback = q_gray > 8
            ys, xs = np.where(fallback)
            if len(xs) == 0:
                continue

        qx0 = max(0, x0 + int(xs.min()) - pad)
        qy0 = max(0, y0 + int(ys.min()) - pad)
        qx1 = min(width, x0 + int(xs.max()) + 1 + pad)
        qy1 = min(height, y0 + int(ys.max()) + 1 + pad)

        if qx1 <= qx0 or qy1 <= qy0:
            continue

        cx = (qx0 + qx1) / 2
        cy = (qy0 + qy1) / 2
        components.append(
            {
                "label": idx,
                "x": int(qx0),
                "y": int(qy0),
                "w": int(qx1 - qx0),
                "h": int(qy1 - qy0),
                "area": int((qx1 - qx0) * (qy1 - qy0)),
                "cx": float(cx),
                "cy": float(cy),
                "quadrant": name,
            },
        )

    return components


def quadrant_name(component: dict[str, int | float], width: int, height: int) -> str:
    if "quadrant" in component:
        return str(component["quadrant"])

    top = float(component["cy"]) < height / 2
    left = float(component["cx"]) < width / 2
    if top and left:
        return "top-left"
    if top and not left:
        return "top-right"
    if not top and left:
        return "bottom-left"
    return "bottom-right"


def write_lossless_svg_from_png(png_path: Path, svg_path: Path, width: int, height: int) -> None:
    b64 = base64.b64encode(png_path.read_bytes()).decode("ascii")
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">\n'
        f'  <image href="data:image/png;base64,{b64}" x="0" y="0" width="{width}" height="{height}"/>\n'
        f"</svg>\n"
    )
    svg_path.write_text(svg, encoding="utf-8")


def write_vector_svg_from_rgba(
    rgba: np.ndarray,
    svg_path: Path,
    vector_colors: int,
    seam_stroke: float,
    corner_radius: int,
    preblur: float,
    feather: float,
    simplify: float,
    monochrome: bool,
    mono_fill: str,
    vector_background: Literal["transparent", "auto"] | str,
) -> None:
    h, w = rgba.shape[:2]
    alpha = rgba[:, :, 3]
    bgr = rgba[:, :, :3]
    fg_mask = alpha > 8

    edge = np.concatenate(
        [
            bgr[:6, :, :].reshape(-1, 3),
            bgr[-6:, :, :].reshape(-1, 3),
            bgr[:, :6, :].reshape(-1, 3),
            bgr[:, -6:, :].reshape(-1, 3),
        ],
        axis=0,
    )
    bg_bgr = np.median(edge, axis=0).astype(np.float32)
    bg_rgb = (int(bg_bgr[2]), int(bg_bgr[1]), int(bg_bgr[0]))
    bg_fill = f"#{bg_rgb[0]:02x}{bg_rgb[1]:02x}{bg_rgb[2]:02x}"

    if not monochrome:
        color_dist = np.linalg.norm(bgr.astype(np.float32) - bg_bgr.reshape((1, 1, 3)), axis=2)
        fg_mask = fg_mask & (color_dist > 6.0)

    if not np.any(fg_mask):
        radius = max(0, min(int(corner_radius), h // 2, w // 2))
        corner_attrs = f' rx="{radius}" ry="{radius}"' if radius > 0 else ""
        svg_path.write_text(
            (
                f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
                f'<rect x="0" y="0" width="{w}" height="{h}" fill="{bg_fill}"{corner_attrs}/>'
                f"</svg>\n"
            ),
            encoding="utf-8",
        )
        return

    paths: list[tuple[float, str]] = []
    if monochrome:
        mono_mask = (fg_mask.astype(np.uint8) * 255)
        mono_mask = cv2.morphologyEx(mono_mask, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
        mono_mask = cv2.medianBlur(mono_mask, 3)
        contours, hierarchy = cv2.findContours(mono_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)
        if hierarchy is not None:
            hinfo = hierarchy[0]
            for cidx, cnt in enumerate(contours):
                if hinfo[cidx][3] != -1:
                    continue
                area = cv2.contourArea(cnt)
                if area < 14:
                    continue

                parts: list[str] = []

                def add_contour(contour: np.ndarray) -> None:
                    peri = cv2.arcLength(contour, True)
                    eps = max(0.25, max(0.0005, simplify) * peri)
                    approx = cv2.approxPolyDP(contour, eps, True)
                    pts = approx.reshape(-1, 2)
                    if len(pts) < 3:
                        return
                    parts.append("M " + " L ".join(f"{int(px)} {int(py)}" for px, py in pts) + " Z")

                add_contour(cnt)
                child = hinfo[cidx][2]
                while child != -1:
                    hole = contours[child]
                    if cv2.contourArea(hole) > 8:
                        add_contour(hole)
                    child = hinfo[child][0]

                if parts:
                    paths.append((area, f'<path fill="{mono_fill}" fill-rule="evenodd" d="{" ".join(parts)}"/>'))
    else:
        smoothed = cv2.bilateralFilter(bgr, d=9, sigmaColor=40, sigmaSpace=16)
        if preblur > 0:
            smoothed = cv2.GaussianBlur(smoothed, (0, 0), sigmaX=preblur, sigmaY=preblur)
        lab = cv2.cvtColor(smoothed, cv2.COLOR_BGR2LAB)
        pixels = lab[fg_mask]

        k = max(4, min(vector_colors, len(pixels)))
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 35, 0.8)
        _, labels, centers = cv2.kmeans(np.float32(pixels), k, None, criteria, 4, cv2.KMEANS_PP_CENTERS)

        cluster_map = np.full((h, w), -1, dtype=np.int32)
        cluster_map[fg_mask] = labels.flatten()

        for idx in range(k):
            cmask = np.zeros((h, w), dtype=np.uint8)
            cmask[cluster_map == idx] = 255
            if cv2.countNonZero(cmask) < 18:
                continue

            cmask = cv2.medianBlur(cmask, 3)
            cmask = cv2.morphologyEx(cmask, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))

            contours, hierarchy = cv2.findContours(cmask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)
            if hierarchy is None:
                continue

            c_lab = np.uint8([[centers[idx]]])
            c_bgr = cv2.cvtColor(c_lab, cv2.COLOR_LAB2BGR)[0, 0]
            fill = f'#{int(c_bgr[2]):02x}{int(c_bgr[1]):02x}{int(c_bgr[0]):02x}'

            hinfo = hierarchy[0]
            for cidx, cnt in enumerate(contours):
                if hinfo[cidx][3] != -1:
                    continue

                area = cv2.contourArea(cnt)
                if area < 12:
                    continue

                parts: list[str] = []

                def add_contour(contour: np.ndarray) -> None:
                    peri = cv2.arcLength(contour, True)
                    eps = max(0.25, max(0.0005, simplify) * peri)
                    approx = cv2.approxPolyDP(contour, eps, True)
                    pts = approx.reshape(-1, 2)
                    if len(pts) < 3:
                        return
                    parts.append("M " + " L ".join(f"{int(px)} {int(py)}" for px, py in pts) + " Z")

                add_contour(cnt)

                child = hinfo[cidx][2]
                while child != -1:
                    hole = contours[child]
                    if cv2.contourArea(hole) > 8:
                        add_contour(hole)
                    child = hinfo[child][0]

                if parts:
                    stroke_attrs = ""
                    if seam_stroke > 0:
                        stroke_attrs = (
                            f' stroke="{fill}" stroke-width="{seam_stroke:.3f}" '
                            'stroke-linejoin="round" stroke-linecap="round"'
                        )
                    paths.append(
                        (
                            area,
                            f'<path fill="{fill}" fill-rule="evenodd"{stroke_attrs} d="{" ".join(parts)}"/>',
                        ),
                    )

    paths.sort(key=lambda item: item[0], reverse=True)
    radius = max(0, min(int(corner_radius), h // 2, w // 2))
    corner_attrs = f' rx="{radius}" ry="{radius}"' if radius > 0 else ""
    defs: list[str] = []
    group_open = "<g>"
    group_close = "</g>"
    if feather > 0 and not monochrome:
        defs.append(
            (
                "<filter id=\"vectorSoften\" x=\"-8%\" y=\"-8%\" width=\"116%\" height=\"116%\">"
                f"<feGaussianBlur stdDeviation=\"{feather:.3f}\"/>"
                "</filter>"
            ),
        )
        group_open = "<g filter=\"url(#vectorSoften)\">"

    rect_line = None
    if vector_background == "auto":
        rect_line = f'<rect x="0" y="0" width="{w}" height="{h}" fill="{bg_fill}"{corner_attrs}/>'
    elif vector_background == "transparent":
        rect_line = None
    else:
        rect_line = f'<rect x="0" y="0" width="{w}" height="{h}" fill="{vector_background}"{corner_attrs}/>'

    svg = [
        (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" shape-rendering="geometricPrecision">'
        ),
        *( ["<defs>", *defs, "</defs>"] if defs else [] ),
        *( [rect_line] if rect_line else [] ),
        group_open,
        *[p for _, p in paths],
        group_close,
        "</svg>",
    ]
    svg_path.write_text("\n".join(svg) + "\n", encoding="utf-8")


def build_monochrome_source_rgba(crop_bgr: np.ndarray, label_mask: np.ndarray, mono_fill: str) -> np.ndarray:
    label_u8 = (label_mask.astype(np.uint8) * 255)
    label_u8 = cv2.morphologyEx(label_u8, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))

    gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)

    roi = gray[label_u8 > 0]
    if roi.size == 0:
        alpha = label_u8
    else:
        # Keep darker tone regions as base "ink"
        dark_cutoff = float(np.percentile(roi, 58))
        dark_mask = ((gray <= dark_cutoff) & (label_u8 > 0)).astype(np.uint8) * 255

        # Add fine detail via edges
        edges = cv2.Canny(gray, threshold1=55, threshold2=130)
        edges = cv2.dilate(edges, np.ones((2, 2), np.uint8), iterations=1)
        edge_mask = ((edges > 0) & (label_u8 > 0)).astype(np.uint8) * 255

        combined = cv2.bitwise_or(dark_mask, edge_mask)
        combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))
        combined = cv2.medianBlur(combined, 3)

        # Ensure some outline is always present
        outline = cv2.morphologyEx(label_u8, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
        alpha = cv2.bitwise_or(combined, outline)

        # Fallback if too sparse
        if cv2.countNonZero(alpha) < max(300, int(0.03 * alpha.size)):
            alpha = label_u8

    h, w = alpha.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    fill = mono_fill.strip().lower()
    if not (fill.startswith("#") and len(fill) == 7):
        raise SystemExit('Invalid --vector-mono-fill value. Use "#RRGGBB".')

    r = int(fill[1:3], 16)
    g = int(fill[3:5], 16)
    b = int(fill[5:7], 16)
    rgba[:, :, 0] = b
    rgba[:, :, 1] = g
    rgba[:, :, 2] = r
    rgba[:, :, 3] = alpha
    return rgba


def build_crop_alpha(crop_bgr: np.ndarray, label_mask: np.ndarray) -> np.ndarray:
    h, w = crop_bgr.shape[:2]

    border = np.concatenate(
        [
            crop_bgr[:8, :, :].reshape(-1, 3),
            crop_bgr[-8:, :, :].reshape(-1, 3),
            crop_bgr[:, :8, :].reshape(-1, 3),
            crop_bgr[:, -8:, :].reshape(-1, 3),
        ],
        axis=0,
    ).astype(np.float32)

    bg_bgr = np.median(border, axis=0)
    dist = np.linalg.norm(crop_bgr.astype(np.float32) - bg_bgr.reshape((1, 1, 3)), axis=2)

    border_dist = np.linalg.norm(border - bg_bgr.reshape((1, 3)), axis=1)
    threshold = float(np.clip(np.percentile(border_dist, 95) + 6.0, 10.0, 48.0))
    candidate_bg = dist <= threshold

    edge_bg = np.zeros((h, w), dtype=np.uint8)
    seen = np.zeros((h, w), dtype=np.uint8)
    stack = list(map(tuple, np.argwhere(np.pad(np.zeros((h - 2, w - 2), dtype=np.uint8), 1, constant_values=1) == 1)))

    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w or seen[y, x]:
            continue
        seen[y, x] = 1
        if not candidate_bg[y, x]:
            continue
        edge_bg[y, x] = 1
        stack.extend([(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)])

    alpha_mask = (edge_bg == 0).astype(np.uint8)
    alpha_mask = cv2.morphologyEx(alpha_mask, cv2.MORPH_CLOSE, np.ones((2, 2), np.uint8))

    # Ensure the main detected component always remains visible.
    alpha_mask = np.maximum(alpha_mask, label_mask.astype(np.uint8))

    return alpha_mask * 255


def parse_background_color(raw: str) -> tuple[int, int, int] | Literal["auto"] | None:
    value = raw.strip().lower()
    if value == "transparent":
        return None
    if value == "auto":
        return "auto"
    if value.startswith("#") and len(value) == 7:
        try:
            return (int(value[1:3], 16), int(value[3:5], 16), int(value[5:7], 16))
        except ValueError as exc:
            raise SystemExit(f"Invalid --background-color value: {raw}") from exc
    raise SystemExit('Invalid --background-color value. Use "transparent", "auto", or "#RRGGBB".')


def apply_background(rgba: np.ndarray, rgb: tuple[int, int, int] | None) -> np.ndarray:
    if rgb is None:
        return rgba

    bgr = rgba[:, :, :3].astype(np.float32)
    alpha = (rgba[:, :, 3:4].astype(np.float32) / 255.0)
    bg_bgr = np.array([rgb[2], rgb[1], rgb[0]], dtype=np.float32).reshape((1, 1, 3))
    out_bgr = (bgr * alpha) + (bg_bgr * (1.0 - alpha))

    out = np.zeros_like(rgba)
    out[:, :, :3] = np.clip(out_bgr, 0, 255).astype(np.uint8)
    out[:, :, 3] = 255
    return out


def estimate_edge_background_rgb(crop_bgr: np.ndarray) -> tuple[int, int, int]:
    edge = np.concatenate(
        [
            crop_bgr[:6, :, :].reshape(-1, 3),
            crop_bgr[-6:, :, :].reshape(-1, 3),
            crop_bgr[:, :6, :].reshape(-1, 3),
            crop_bgr[:, -6:, :].reshape(-1, 3),
        ],
        axis=0,
    )
    b, g, r = np.median(edge, axis=0)
    return int(r), int(g), int(b)


def place_on_square_canvas(rgba: np.ndarray, square_size: int) -> np.ndarray:
    if square_size <= 0:
        return rgba

    crop_h, crop_w = rgba.shape[:2]
    if crop_w > square_size or crop_h > square_size:
        scale = min(square_size / crop_w, square_size / crop_h)
        new_w = max(1, int(round(crop_w * scale)))
        new_h = max(1, int(round(crop_h * scale)))
        rgba = cv2.resize(rgba, (new_w, new_h), interpolation=cv2.INTER_AREA)
        crop_h, crop_w = rgba.shape[:2]

    canvas = np.zeros((square_size, square_size, 4), dtype=np.uint8)
    x_off = (square_size - crop_w) // 2
    y_off = (square_size - crop_h) // 2
    canvas[y_off : y_off + crop_h, x_off : x_off + crop_w] = rgba
    return canvas


def place_on_square_canvas_with_replicated_edges(rgba: np.ndarray, square_size: int) -> np.ndarray:
    if square_size <= 0:
        return rgba

    crop_h, crop_w = rgba.shape[:2]
    if crop_w > square_size or crop_h > square_size:
        scale = min(square_size / crop_w, square_size / crop_h)
        new_w = max(1, int(round(crop_w * scale)))
        new_h = max(1, int(round(crop_h * scale)))
        rgba = cv2.resize(rgba, (new_w, new_h), interpolation=cv2.INTER_AREA)
        crop_h, crop_w = rgba.shape[:2]

    left = (square_size - crop_w) // 2
    right = square_size - crop_w - left
    top = (square_size - crop_h) // 2
    bottom = square_size - crop_h - top

    return cv2.copyMakeBorder(
        rgba,
        top,
        bottom,
        left,
        right,
        borderType=cv2.BORDER_REPLICATE,
    )


def resize_to_fit_square(rgba: np.ndarray, square_size: int, inset: int) -> np.ndarray:
    if square_size <= 0:
        return rgba

    inset = max(0, min(inset, square_size // 2))
    target = max(1, square_size - (inset * 2))

    h, w = rgba.shape[:2]
    scale = min(target / max(1, w), target / max(1, h))
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))

    interpolation = cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA
    return cv2.resize(rgba, (new_w, new_h), interpolation=interpolation)


def apply_corner_radius(rgba: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return rgba

    h, w = rgba.shape[:2]
    radius = min(radius, h // 2, w // 2)
    if radius <= 0:
        return rgba

    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.rectangle(mask, (radius, 0), (w - radius, h), 255, thickness=-1)
    cv2.rectangle(mask, (0, radius), (w, h - radius), 255, thickness=-1)
    cv2.circle(mask, (radius, radius), radius, 255, thickness=-1)
    cv2.circle(mask, (w - radius, radius), radius, 255, thickness=-1)
    cv2.circle(mask, (radius, h - radius), radius, 255, thickness=-1)
    cv2.circle(mask, (w - radius, h - radius), radius, 255, thickness=-1)

    out = rgba.copy()
    out[:, :, 3] = np.minimum(out[:, :, 3], mask)
    return out


def main() -> int:
    args = parse_args()
    source = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    background_color = parse_background_color(args.background_color)
    vector_background = parse_vector_background(args.vector_background)

    image = cv2.imread(str(source), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise SystemExit(f"Could not read input image: {source}")
    if image.ndim != 3 or image.shape[2] not in (3, 4):
        raise SystemExit("Input image must be RGB or RGBA")

    bgr, alpha = to_bgr_alpha(image)
    image_h, image_w = bgr.shape[:2]

    if args.extraction == "quadrants":
        labels = np.zeros((image_h, image_w), dtype=np.int32)
        components = detect_quadrant_components(bgr=bgr, alpha=alpha, pad=args.pad)
    else:
        labels, components = detect_components(bgr=bgr, alpha=alpha, min_area=args.min_area)
        components = sorted(components, key=lambda c: int(c["area"]), reverse=True)

    if not components:
        raise SystemExit("No logo-like components detected")

    seen: dict[str, int] = {}
    outputs: list[str] = []

    for component in components:
        qname = quadrant_name(component, image_w, image_h)
        seen[qname] = seen.get(qname, 0) + 1
        suffix = "" if seen[qname] == 1 else f"-{seen[qname]}"
        stem = f"{args.prefix}-{qname}{suffix}"

        x = int(component["x"])
        y = int(component["y"])
        w = int(component["w"])
        h = int(component["h"])

        x0 = max(0, x - args.pad)
        y0 = max(0, y - args.pad)
        x1 = min(image_w, x + w + args.pad)
        y1 = min(image_h, y + h + args.pad)

        crop_bgr = bgr[y0:y1, x0:x1].copy()
        crop_alpha = alpha[y0:y1, x0:x1].copy()
        if args.extraction == "quadrants":
            mask = crop_alpha > 8
        else:
            mask = (labels[y0:y1, x0:x1] == int(component["label"]))

        rgba = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2BGRA)

        if background_color is None:
            if np.any(crop_alpha < 250):
                rgba[:, :, 3] = crop_alpha
            else:
                rgba[:, :, 3] = build_crop_alpha(crop_bgr, mask)
            resolved_background: tuple[int, int, int] | None = None
        else:
            rgba[:, :, 3] = 255
            if background_color == "auto":
                resolved_background = estimate_edge_background_rgb(crop_bgr)
            else:
                resolved_background = background_color

        rgba = resize_to_fit_square(rgba, args.square_size, args.content_inset)

        if background_color is None:
            rgba = place_on_square_canvas(rgba, args.square_size)
            rgba = apply_background(rgba, resolved_background)
        else:
            rgba = apply_background(rgba, resolved_background)
            rgba = place_on_square_canvas_with_replicated_edges(rgba, args.square_size)

        rgba = apply_corner_radius(rgba, args.corner_radius)

        crop_png = output_dir / f"{stem}-crop.png"
        lossless_svg = output_dir / f"{stem}-lossless.svg"
        vector_suffix = "vector-mono" if args.vector_monochrome else "vector"
        vector_svg = output_dir / f"{stem}-{vector_suffix}.svg"
        mono_source_png = output_dir / f"{stem}-mono-source.png"

        cv2.imwrite(str(crop_png), rgba)

        crop_h, crop_w = rgba.shape[:2]
        if args.mode in {"lossless", "both"}:
            write_lossless_svg_from_png(crop_png, lossless_svg, crop_w, crop_h)
        if args.mode in {"vector", "both"}:
            vector_input = rgba
            if args.vector_monochrome:
                vector_input = build_monochrome_source_rgba(crop_bgr, mask, args.vector_mono_fill)
                vector_input = resize_to_fit_square(vector_input, args.square_size, args.content_inset)
                vector_input = place_on_square_canvas(vector_input, args.square_size)
                vector_input = apply_corner_radius(vector_input, args.corner_radius)
                cv2.imwrite(str(mono_source_png), vector_input)

            write_vector_svg_from_rgba(
                vector_input,
                vector_svg,
                args.vector_colors,
                args.vector_seam_stroke,
                args.corner_radius,
                args.vector_preblur,
                args.vector_feather,
                args.vector_simplify,
                args.vector_monochrome,
                args.vector_mono_fill,
                vector_background,
            )

        if args.mode == "lossless":
            outputs.append(f"{crop_png.name} | {lossless_svg.name} | {crop_w}x{crop_h}")
        elif args.mode == "vector":
            outputs.append(f"{crop_png.name} | {vector_svg.name} | {crop_w}x{crop_h}")
        else:
            outputs.append(
                f"{crop_png.name} | {lossless_svg.name} | {vector_svg.name} | {crop_w}x{crop_h}",
            )

    for line in sorted(outputs):
        print(line)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
