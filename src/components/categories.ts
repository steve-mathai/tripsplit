import type { Category } from "@/lib/types";

export const CATEGORY_META: Record<Category, { label: string; emoji: string; color: string }> = {
  stay: { label: "Stay", emoji: "🏠", color: "#0f766e" },
  travel: { label: "Travel", emoji: "🚌", color: "#4f46e5" },
  food: { label: "Food", emoji: "🍛", color: "#d97706" },
  activities: { label: "Activities", emoji: "🎟️", color: "#be185d" },
};
