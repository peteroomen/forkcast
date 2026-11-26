export type MealKind = "head" | "recipe";
export type Course = "main" | "side" | "dessert";
export type Effort = "quick" | "medium" | "project";

export interface Household {
  id: string;
  name: string;
  cycle_length_days: 7 | 14;
  cycle_start_dow: number;
  default_servings: number;
}

export interface Member {
  id: string;
  household_id: string;
  name: string;
  user_id: string | null;
  is_cook: boolean;
  gives_feedback: boolean;
  colour: string | null;
  sort_order: number;
}

export interface Meal {
  id: string;
  household_id: string;
  name: string;
  kind: MealKind;
  course: Course;
  description: string | null;
  notes: string | null;
  method: string | null;
  cuisine: string | null;
  protein: string | null;
  effort: Effort;
  tags: string[];
  target_interval_days: number | null;
  servings: number | null;
  total_minutes: number | null;
  weeknight_ok: boolean;
  batch_friendly: boolean;
  fresh_heavy: boolean;
  prep_note: string | null;
  prep_lead_hours: number | null;
  source_url: string | null;
  source_name: string | null;
  image_url: string | null;
  needs_recipe: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Variation {
  id: string;
  meal_id: string;
  name: string;
  notes: string | null;
  method: string | null;
  source_url: string | null;
  sort_order: number;
  archived: boolean;
}

export interface Ingredient {
  id: string;
  meal_id: string;
  variation_id: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  section: string;
  optional: boolean;
  sort_order: number;
}

export interface MealStats {
  meal_id: string;
  times_cooked: number;
  last_cooked: string | null;
  days_since: number | null;
  avg_rating: number | null;
  latest_make_again: "yes" | "maybe" | "no" | null;
}

export interface LogEntry {
  id: string;
  date: string;
  slot_type: "cook" | "leftovers" | "takeaway" | "out";
  meal_id: string | null;
  variation_id: string | null;
  cook_member_id: string | null;
  make_again: "yes" | "maybe" | "no" | null;
  notes: string | null;
}

export const PROTEINS = ["beef", "chicken", "pork", "lamb", "fish", "seafood", "vegetarian", "mixed"] as const;
