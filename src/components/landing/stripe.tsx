import { personTint } from "../person-tint";
import { PEOPLE } from "./demo";

/** The group as a ribbon: one bar per friend, each in that friend's person tint. Decorative. */
export function Stripe({ className, animate = false }: { className: string; animate?: boolean }) {
  return (
    <div aria-hidden="true" className={`flex ${className}`}>
      {PEOPLE.map((person, index) => (
        <span
          key={person.name}
          className={`person-bg flex-1 ${animate ? "landing-bar" : ""}`}
          style={{ ...personTint(person.color).style, "--i": index } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
