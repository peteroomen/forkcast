import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export default function PlanPage() {
  return (
    <ComingSoon
      icon={CalendarDays}
      title="Fortnight planner"
      body="Coming next: claim nights, rotation-aware suggestions, leftovers and takeaway nights. Logging meals in the library now gives it history to work with."
    />
  );
}
