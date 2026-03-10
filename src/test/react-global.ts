/**
 * This file MUST be listed first in vitest `setupFiles`.
 *
 * styled-components v6 reads `globalThis.React` at module-load time.
 * Because ESM static imports are hoisted and evaluated before any
 * module-body code runs, putting `globalThis.React = React` inside the
 * same file that also imports styled-components is too late — the import
 * would have already been evaluated before the assignment executes.
 *
 * Running this file first guarantees React is on the global before
 * styled-components (or any other peer) loads in subsequent setup files.
 */
import * as React from "react";

(globalThis as typeof globalThis & { React: unknown }).React = React;
