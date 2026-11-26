import { requireHousehold } from "@/lib/data";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings · Forkcast" };

export default async function SettingsPage() {
  const { household, members, user } = await requireHousehold();
  return <SettingsForm household={household} members={members} email={user.email ?? ""} />;
}
