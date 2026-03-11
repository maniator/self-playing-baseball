#!/usr/bin/env python3
"""
Generate all app / PWA icon assets from the source logo.

Usage:
    python scripts/generate_app_icons.py [--src <path>]

Outputs (all written relative to repo root):
    public/images/blipit-32.png    — browser favicon fallback
    public/images/blipit-180.png   — Apple touch icon
    public/images/blipit-192.png   — PWA icon (any)
    public/images/blipit-512.png   — PWA icon (any maskable)
    public/images/blipit.svg       — lossless SVG wrapper (embeds 512 PNG)
    public/og-image.png            — OG / Twitter card image

The script trims transparent padding, centres the logo on a transparent
square canvas, and writes RGBA PNGs so the icons render correctly on any
background colour.
"""

import argparse
import base64
from pathlib import Path

from PIL import Image

DEFAULT_SRC = Path("public/images/blipit_logo_transparent_trimmed.png")

SIZES = [
    (32, "blipit-32.png"),
    (180, "blipit-180.png"),
    (192, "blipit-192.png"),
    (512, "blipit-512.png"),
]

OUT_DIR = Path("public/images")
OG_IMAGE = Path("public/og-image.png")


def generate(src: Path) -> None:
    if not src.exists():
        raise FileNotFoundError(f"Source logo not found: {src}")

    with Image.open(src) as im:
        rgba = im.convert("RGBA")

    # Trim to non-transparent bounding box
    bbox = rgba.getchannel("A").getbbox()
    cropped = rgba.crop(bbox) if bbox else rgba

    generated = []

    for size, filename in SIZES:
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        cw, ch = cropped.size
        scale = min(size / cw, size / ch)
        nw = max(1, round(cw * scale))
        nh = max(1, round(ch * scale))
        resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
        x = (size - nw) // 2
        y = (size - nh) // 2
        canvas.alpha_composite(resized, (x, y))
        out = OUT_DIR / filename
        canvas.save(out)
        generated.append(out)
        print(f"  wrote {out}  ({size}x{size})")

    # SVG wraps the 512 PNG losslessly so browsers get a vector-clean icon
    png_512 = OUT_DIR / "blipit-512.png"
    b64 = base64.b64encode(png_512.read_bytes()).decode("ascii")
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n'
        f'  <image href="data:image/png;base64,{b64}" x="0" y="0" width="512" height="512"/>\n'
        "</svg>\n"
    )
    svg_out = OUT_DIR / "blipit.svg"
    svg_out.write_text(svg, encoding="utf-8")
    print(f"  wrote {svg_out}")

    # OG image is a copy of the 512 PNG
    OG_IMAGE.write_bytes(png_512.read_bytes())
    print(f"  wrote {OG_IMAGE}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate BlipIt app icon pack")
    parser.add_argument(
        "--src",
        type=Path,
        default=DEFAULT_SRC,
        help=f"Source logo PNG (default: {DEFAULT_SRC})",
    )
    args = parser.parse_args()
    print(f"Generating icons from: {args.src}")
    generate(args.src)
    print("Done.")


if __name__ == "__main__":
    main()
