import { notFound } from "next/navigation";
import { getMeal, requireHousehold } from "@/lib/data";
import { MealView } from "./MealView";

export default async function MealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ members, household }, detail] = await Promise.all([requireHousehold(), getMeal(id)]);
  if (!detail) notFound();
  return <MealView detail={detail} members={members} householdServings={household.default_servings} />;
}
