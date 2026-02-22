/**
 * Centralised responsive breakpoints.
 *
 * NOTE: CSS custom properties cannot be used inside @media queries (the spec
 * evaluates media conditions before the cascade resolves variables).  We
 * therefore expose these as plain TypeScript values and interpolate them
 * directly into styled-components template literals.
 *
 * Keep the SCSS mirror in src/index.scss ($bp-mobile / $bp-desktop) in sync
 * whenever these values change.
 */
export const breakpoints = {
  /** Max width (inclusive) for the mobile layout. */
  mobile: 768,
  /** Min width (inclusive) for the desktop layout. */
  desktop: 1024,
} as const;

/**
 * Ready-made media-query strings for use inside styled-components template
 * literals:
 *
 * ```ts
 * const Foo = styled.div`
 *   ${mq.mobile} { font-size: 11px; }
 *   ${mq.desktop} { display: grid; }
 * `;
 * ```
 */
export const mq = {
  mobile: `@media (max-width: ${breakpoints.mobile}px)`,
  desktop: `@media (min-width: ${breakpoints.desktop}px)`,
  tablet: `@media (min-width: ${breakpoints.mobile + 1}px) and (max-width: ${breakpoints.desktop - 1}px)`,
  /** Applies to tablet + desktop (everything above the mobile breakpoint). */
  notMobile: `@media (min-width: ${breakpoints.mobile + 1}px)`,
} as const;
