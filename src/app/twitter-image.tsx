/**
 * X/Twitter reads its own `twitter:image` tag rather than falling back to
 * `og:image` in every client, so the same card is exported under the
 * twitter-image convention too.
 */
export { default, alt, size, contentType } from "./opengraph-image";
