import type { ComponentType, SVGProps } from "react";
import type { Category } from "@/lib/types";
import { BusIcon, FoodIcon, HomeIcon, TicketIcon } from "./icons";

export const CATEGORY_META: Record<
  Category,
  { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; color: string }
> = {
  stay: { label: "Stay", Icon: HomeIcon, color: "#0f766e" },
  travel: { label: "Travel", Icon: BusIcon, color: "#4f46e5" },
  food: { label: "Food", Icon: FoodIcon, color: "#d97706" },
  activities: { label: "Activities", Icon: TicketIcon, color: "#be185d" },
};
