import { getLibrary, requireHousehold } from "@/lib/data";
import { LibraryView } from "./LibraryView";

export const metadata = { title: "Meals · Forkcast" };

export default async function LibraryPage() {
  const [{ members }, meals] = await Promise.all([requireHousehold(), getLibrary()]);
  return <LibraryView meals={meals} members={members} />;
}
