// Trip dates travel as 'YYYY-MM-DD' strings. Everything here works in UTC so the
// weekday never shifts with the server's or the phone's timezone.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, weekday };
}

/** "Fri 30 Oct" */
export function formatDayShort(iso: string): string {
  const p = parts(iso);
  return `${WEEKDAYS[p.weekday]} ${p.day} ${MONTHS[p.month - 1]}`;
}

/** "Fri 30 Oct 2026" */
export function formatDayLong(iso: string): string {
  return `${formatDayShort(iso)} ${parts(iso).year}`;
}

/** "Fri 30 Oct - Mon 2 Nov 2026" (en dash), year shown once when both ends share it. */
export function formatDateRange(startIso: string, endIso: string): string {
  const a = parts(startIso);
  const b = parts(endIso);
  if (startIso === endIso) return formatDayLong(startIso);
  const start = a.year === b.year ? formatDayShort(startIso) : formatDayLong(startIso);
  return `${start} – ${formatDayLong(endIso)}`;
}

/** Every date from start to end inclusive, capped so a typo'd range cannot explode the page. */
export function tripDays(startIso: string, endIso: string, cap = 60): string[] {
  const days: string[] = [];
  const cursor = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  while (cursor <= end && days.length < cap) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** "06:00" -> "6:00 am", "13:30" -> "1:30 pm". */
export function formatTime12(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
