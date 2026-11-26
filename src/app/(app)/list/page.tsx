import { ShoppingBasket } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export default function ListPage() {
  return (
    <ComingSoon
      icon={ShoppingBasket}
      title="Shopping list"
      body="Coming after the planner: the main shop plus a mid-fortnight top-up, grouped by section, with a quick “got this?” pantry check."
    />
  );
}
