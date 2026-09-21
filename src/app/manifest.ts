import type { MetadataRoute } from "next";
import { pwa } from "../lib/pwa-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: pwa.scope,
    name: pwa.name,
    short_name: pwa.shortName,
    description: pwa.description,
    start_url: pwa.startUrl,
    scope: pwa.scope,
    display: "standalone",
    background_color: pwa.backgroundColor,
    theme_color: pwa.themeColor,
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
