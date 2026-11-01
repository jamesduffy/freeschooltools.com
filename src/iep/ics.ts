import { addDays } from "./dates";
import type { Deadline } from "./deadlines";

/** Calendar (.ics) export. Pure: the caller supplies `now`. */

export function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 bytes, as the format requires. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) { parts.push(cur); cur = ch; bytes = b; limit = 74; }
    else { cur += ch; bytes += b; }
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

const compact = (ymd: string) => ymd.replace(/-/g, "");

function stamp(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`;
}

export function buildIcs(deadlines: Deadline[], opts: { reminder: boolean; now: Date }): string {
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//freeschooltools.com//IEP Goal Toolkit//EN", "CALSCALE:GREGORIAN"];
  for (const d of deadlines) {
    const title = `${d.code} ${d.rule.eventLabel}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.studentId}-${d.rule.id}-${d.due}@freeschooltools.com`,
      `DTSTAMP:${stamp(opts.now)}`,
      `DTSTART;VALUE=DATE:${compact(d.due)}`,
      `DTEND;VALUE=DATE:${compact(addDays(d.due, 1))}`,
      `SUMMARY:${icsEscape(title)}`,
      `DESCRIPTION:${icsEscape("Planning aid, not legal advice. Rule not yet verified. Confirm with your district.")}`,
    );
    if (opts.reminder) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(title)}`, "TRIGGER:-P14D", "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
