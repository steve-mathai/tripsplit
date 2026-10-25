/** An error whose message is safe to show to the user as-is (bad input, not a bug). */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
