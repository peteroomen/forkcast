import { getListPage } from "@/lib/list-data";
import { ListScreen } from "./ListScreen";

export const metadata = { title: "Shopping · Forkcast" };

export default async function ListPage() {
  const data = await getListPage();
  return <ListScreen data={data} />;
}
