import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_TAGLINE } from "./lib/brand";
import { DEFAULT_DESCRIPTION } from "./lib/site-seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1E3A5F",
    lang: "en-CA",
    icons: [
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
