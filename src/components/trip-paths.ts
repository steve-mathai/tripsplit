/** The part of a pathname after /t/<slug>/, e.g. "expenses/new" ("" for the plan tab). */
export function tripSubpath(pathname: string, slug: string): string {
  const base = `/t/${slug}`;
  return pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, "") : "";
}

/** The add/edit expense pages, which get a slim header and their own bottom save bar. */
export function isExpenseFormRoute(subpath: string): boolean {
  return subpath === "expenses/new" || /^expenses\/[^/]+$/.test(subpath);
}
