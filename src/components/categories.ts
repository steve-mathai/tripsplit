import type { ComponentType, SVGProps } from "react";
import type { Category } from "@/lib/types";
import { BusIcon, FoodIcon, HomeIcon, TicketIcon } from "./icons";

export interface CategoryMeta {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Pale tile background. A CSS variable, so it switches with the theme. */
  tint: string;
  /** Dark ink of the same hue for icon and label on the tint. */
  ink: string;
  /** Full-strength colour for charts (bars, ring segments, legend dots). Theme-aware. */
  chart: string;
  /** Legacy: the light-theme chart colour as a hex, kept because old code appends alpha digits to it. Use `chart`. */
  color: string;
}

/**
 * <span style={{ backgroundColor: meta.tint, color: meta.ink }} className="rounded-panel p-2"><meta.Icon /></span>
 * <span style={{ backgroundColor: meta.chart }} className="h-2.5 w-2.5 rounded-full" />
 */
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  stay: {
    label: "Stay",
    Icon: HomeIcon,
    tint: "var(--cat-stay-tint)",
    ink: "var(--cat-stay-ink)",
    chart: "var(--cat-stay-chart)",
    color: "#0f766e",
  },
  travel: {
    label: "Travel",
    Icon: BusIcon,
    tint: "var(--cat-travel-tint)",
    ink: "var(--cat-travel-ink)",
    chart: "var(--cat-travel-chart)",
    color: "#1d5fd6",
  },
  food: {
    label: "Food",
    Icon: FoodIcon,
    tint: "var(--cat-food-tint)",
    ink: "var(--cat-food-ink)",
    chart: "var(--cat-food-chart)",
    color: "#b45309",
  },
  activities: {
    label: "Activities",
    Icon: TicketIcon,
    tint: "var(--cat-activities-tint)",
    ink: "var(--cat-activities-ink)",
    chart: "var(--cat-activities-chart)",
    color: "#be123c",
  },
};
