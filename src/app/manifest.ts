import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forkcast",
    short_name: "Forkcast",
    start_url: "/library",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#2f6b4f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
