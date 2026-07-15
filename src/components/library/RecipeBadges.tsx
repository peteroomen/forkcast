import { ChefHat, Clock, Star } from "lucide-react";
import type { Recipe } from "@/lib/types";

const TAG_LABEL: Record<string, string> = {
  "megan-friendly": "Megan",
  "jamie-friendly": "Jamie",
  "kid-friendly": "Kid-friendly",
  "weekend-cook": "Weekend",
  quick: "≤30 min",
  new: "New",
};

export function RecipeBadges({ recipe }: { recipe: Recipe }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {recipe.is_favourite && (
        <span className="badge badge-sm badge-warning gap-1">
          <Star className="size-3" />
        </span>
      )}
      {recipe.needs_recipe && (
        <span className="badge badge-sm badge-error badge-outline">
          recipe owed
        </span>
      )}
      <span className="badge badge-sm badge-ghost gap-1" title={recipe.cooked_by}>
        <ChefHat className="size-3" /> {recipe.cooked_by}
      </span>
      {recipe.time_minutes != null && (
        <span className="badge badge-sm badge-ghost gap-1">
          <Clock className="size-3" /> {recipe.time_minutes} min
        </span>
      )}
      {recipe.tags.map((t) => (
        <span key={t} className="badge badge-sm badge-outline">
          {TAG_LABEL[t] ?? t}
        </span>
      ))}
    </div>
  );
}
