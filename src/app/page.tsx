import { Launch } from "@/components/Launch";

/**
 * The installed app's start page. It always answers 200 (Chrome is happier
 * installing a start_url that doesn't redirect) and then hands off client-side.
 */
export default function Home() {
  return <Launch />;
}
