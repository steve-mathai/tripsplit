import { CreateTripForm } from "../create-trip-form";
import { delay } from "./delay";
import { LEAD, MARGIN, TITLE } from "./type";

// The form carries id="start" itself, so the page's "Create a trip" links land on it.
export function Start() {
  return (
    <section aria-labelledby="start-title" className={`${MARGIN} py-24 lg:py-40`}>
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-3">
        <div className="lg:col-span-5">
          <h2 id="start-title" className={TITLE} data-reveal="rise">
            Create a trip
          </h2>
          <p className={`${LEAD} mt-4 max-w-[34ch]`} data-reveal="rise" style={delay(1)}>
            Start a trip, then drop the link in your group chat.
          </p>
        </div>
        <div className="lg:col-span-6 lg:col-start-7 [&>form]:border-transparent" data-reveal="rise" style={delay(2)}>
          <CreateTripForm />
        </div>
      </div>
    </section>
  );
}
