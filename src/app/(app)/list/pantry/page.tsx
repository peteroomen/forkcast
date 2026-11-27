import { getListPage } from "@/lib/list-data";
import { PantryEditor } from "./PantryEditor";

export const metadata = { title: "Pantry · Forkcast" };

export default async function PantryPage() {
  const { pantry } = await getListPage();
  return <PantryEditor items={pantry} />;
}
