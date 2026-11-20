import { UserError } from "./errors";

/** Throws a friendly error when adding one more of something would pass the cap. */
export function assertRoomFor(currentCount: number, max: number, noun: string): void {
  if (currentCount >= max) throw new UserError(`This trip already has the maximum of ${max} ${noun}`);
}
