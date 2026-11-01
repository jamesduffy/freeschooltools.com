/** The 40 built in icons. All original, drawn on a 64 by 64 grid with a 4 unit outline.
 *  Class names on the shapes (prefixed si-): f = main fill, p = paper (secondary fill), k = solid ink, l = outline only,
 *  n = no outline, t = thinner line. Colors come from CSS variables (--ic-fill, --ic-paper, --ic-ink), so one
 *  drawing works in color, in high contrast and in black and white print. */
export type IconGroup = "routines" | "subjects" | "working" | "meals" | "events";
export type IconDef = { id: string; name: string; group: IconGroup; keywords: string; body: string };

const r1 = (n: number) => Math.round(n * 10) / 10;
/** A neutral front-facing figure (no face): head circle plus rounded shoulders. `bottom` is the lowest y. */
function fig(cx: number, bottom: number, r: number, cls = "si-f"): string {
  const w = 1.7 * r, h = 2.2 * r, y0 = bottom - h;
  return `<circle class="${cls}" cx="${r1(cx)}" cy="${r1(y0 - r - 1)}" r="${r1(r)}"/>` +
    `<path class="${cls}" d="M${r1(cx - w)} ${r1(bottom)}V${r1(y0 + r)}a${r1(w)} ${r1(r)} 0 0 1 ${r1(2 * w)} 0V${r1(bottom)}z"/>`;
}

const D: IconDef[] = [
  // Arrival and routines
  { id: "backpack", name: "Backpack", group: "routines", keywords: "bag school", body:
    `<path class="si-l" d="M24 17V12a8 8 0 0 1 16 0v5"/><rect class="si-f" x="12" y="16" width="40" height="42" rx="12"/><path class="si-l" d="M12 30h40"/><rect class="si-p" x="20" y="37" width="24" height="15" rx="5"/>` },
  { id: "coat", name: "Coat", group: "routines", keywords: "jacket winter", body:
    `<path class="si-f" d="M24 6 10 12 6 50h12v8h28v-8h12L54 12 40 6 32 18z"/><path class="si-l si-t" d="M17 20v30M47 20v30M32 18v40"/>` },
  { id: "lunchbox", name: "Lunchbox", group: "routines", keywords: "lunch bag", body:
    `<path class="si-l" d="M22 24v-6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6"/><rect class="si-f" x="6" y="24" width="52" height="32" rx="6"/><path class="si-l" d="M6 38h52"/><rect class="si-p" x="26" y="33" width="12" height="10" rx="2"/>` },
  { id: "calendar", name: "Calendar", group: "routines", keywords: "date day", body:
    `<rect class="si-p" x="8" y="12" width="48" height="46" rx="6"/><path class="si-f" d="M8 18a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v8H8z"/><path class="si-l" d="M20 5v10M44 5v10"/>` +
    `<rect class="si-k si-n" x="15" y="32" width="10" height="8" rx="1"/><rect class="si-k si-n" x="27" y="32" width="10" height="8" rx="1"/><rect class="si-k si-n" x="39" y="32" width="10" height="8" rx="1"/><rect class="si-k si-n" x="15" y="44" width="10" height="8" rx="1"/><rect class="si-k si-n" x="27" y="44" width="10" height="8" rx="1"/>` },
  { id: "circle-time", name: "Circle time", group: "routines", keywords: "carpet rug meeting gather", body:
    `<circle class="si-f" cx="32" cy="32" r="10"/><circle class="si-p" cx="53" cy="32" r="6"/><circle class="si-p" cx="42.5" cy="50.2" r="6"/><circle class="si-p" cx="21.5" cy="50.2" r="6"/><circle class="si-p" cx="11" cy="32" r="6"/><circle class="si-p" cx="21.5" cy="13.8" r="6"/><circle class="si-p" cx="42.5" cy="13.8" r="6"/>` },
  { id: "line-up", name: "Line up", group: "routines", keywords: "line queue hallway walk", body:
    fig(15, 56, 9) + fig(38, 50, 7) + fig(53, 45, 5.5) },
  { id: "wash-hands", name: "Wash hands", group: "routines", keywords: "sink soap water", body:
    `<rect class="si-f" x="4" y="5" width="34" height="11" rx="4"/><rect class="si-f" x="30" y="14" width="12" height="12" rx="3"/><path class="si-p si-t" d="M33 31q-5 6 0 10q5-4 0-10zM43 37q-5 6 0 10q5-4 0-10z"/><path class="si-f" d="M6 50h52c0 8-6 11-14 11H20C12 61 6 58 6 50z"/>` },
  { id: "bathroom", name: "Bathroom", group: "routines", keywords: "toilet restroom", body:
    `<rect class="si-f" x="18" y="5" width="28" height="19" rx="4"/><circle class="si-k si-n" cx="32" cy="14" r="3"/><path class="si-f" d="M8 28h48c0 12-6 20-14 22v8H22v-8C14 48 8 40 8 28z"/><path class="si-l si-t" d="M14 35h36"/>` },
  { id: "clean-up", name: "Clean up", group: "routines", keywords: "broom tidy sweep", body:
    `<rect class="si-f" x="29" y="3" width="6" height="31" rx="3"/><path class="si-f" d="M18 34h28l8 24H10z"/><path class="si-l si-t" d="M25 44l-3 12M32 44v12M39 44l3 12"/>` },
  { id: "pack-up", name: "Pack up", group: "routines", keywords: "put away box", body:
    `<path class="si-l" d="M32 4v24M21 18l11 11 11-11"/><path class="si-f" d="M8 36h48v22H8z"/><path class="si-p" d="M24 36h16v10H24z"/>` },
  { id: "go-home", name: "Go home", group: "routines", keywords: "home house dismissal", body:
    `<rect class="si-f" x="43" y="10" width="8" height="14"/><path class="si-p" d="M12 28h40v30H12z"/><path class="si-f" d="M4 32 32 8l28 24z"/><rect class="si-f" x="26" y="40" width="12" height="18"/>` },
  { id: "bus", name: "Bus", group: "routines", keywords: "school bus ride", body:
    `<rect class="si-f" x="4" y="12" width="56" height="38" rx="7"/><rect class="si-p" x="10" y="18" width="12" height="12" rx="2"/><rect class="si-p" x="26" y="18" width="12" height="12" rx="2"/><rect class="si-p" x="42" y="18" width="12" height="12" rx="2"/><path class="si-l" d="M4 38h56"/><circle class="si-p" cx="18" cy="50" r="6"/><circle class="si-p" cx="46" cy="50" r="6"/>` },
  // Subjects
  { id: "reading", name: "Reading", group: "subjects", keywords: "book", body:
    `<path class="si-f" d="M32 16C24 10 12 10 5 14v36c7-4 19-4 27 2z"/><path class="si-f" d="M32 16c8-6 20-6 27-2v36c-7-4-19-4-27 2z"/><path class="si-l si-t" d="M12 24h13M12 33h13M39 24h13M39 33h13"/>` },
  { id: "writing", name: "Writing", group: "subjects", keywords: "pencil", body:
    `<path class="si-l" d="M6 60h22"/><g transform="rotate(45 32 32)"><rect class="si-f" x="26" y="10" width="12" height="32"/><path class="si-p" d="M26 42h12l-6 14z"/><path class="si-k si-n" d="M29.5 51h5l-2.5 5z"/><rect class="si-p" x="26" y="4" width="12" height="8" rx="2"/></g>` },
  { id: "math", name: "Math", group: "subjects", keywords: "numbers add subtract", body:
    `<rect class="si-f" x="4" y="4" width="56" height="56" rx="8"/><path class="si-l" d="M20 13v14M13 20h14M37 20h14M13 37l14 14M27 37 13 51M37 41h14M37 49h14"/>` },
  { id: "science", name: "Science", group: "subjects", keywords: "flask experiment lab", body:
    `<path class="si-f" d="M28 6h8v18l19 30c2 5-1 6-5 6H14c-4 0-7-1-5-6l19-30z"/><path class="si-l" d="M23 6h18"/><path class="si-l si-t" d="M16 42h32"/><circle class="si-p si-t" cx="28" cy="51" r="3"/><circle class="si-p si-t" cx="38" cy="48" r="2"/>` },
  { id: "social-studies", name: "Social studies", group: "subjects", keywords: "globe world map geography history", body:
    `<circle class="si-f" cx="32" cy="32" r="27"/><ellipse class="si-l si-t" cx="32" cy="32" rx="11" ry="27"/><path class="si-l si-t" d="M5 32h54M9 19h46M9 45h46"/>` },
  { id: "art", name: "Art", group: "subjects", keywords: "paint palette draw", body:
    `<path class="si-f" d="M32 6C16 6 5 18 5 32c0 15 11 26 25 26 6 0 8-5 5-9-3-5 1-9 7-9h10c6 0 9-4 9-8C61 16 48 6 32 6z"/><circle class="si-p" cx="20" cy="24" r="4"/><circle class="si-p" cx="34" cy="16" r="4"/><circle class="si-p" cx="48" cy="24" r="4"/><circle class="si-p" cx="17" cy="40" r="4"/>` },
  { id: "music", name: "Music", group: "subjects", keywords: "notes song sing", body:
    `<path class="si-l" d="M24 48V14M50 44V10"/><path class="si-k" d="M24 14 50 8v10L24 24z"/><circle class="si-f" cx="17" cy="48" r="7"/><circle class="si-f" cx="43" cy="44" r="7"/>` },
  { id: "pe", name: "P.E.", group: "subjects", keywords: "physical education gym ball sports", body:
    `<circle class="si-f" cx="32" cy="32" r="27"/><path class="si-l" d="M5 32h54M32 5v54M14 12q14 20 0 40M50 12q-14 20 0 40"/>` },
  { id: "library", name: "Library", group: "subjects", keywords: "books shelf", body:
    `<rect class="si-f" x="5" y="16" width="12" height="40"/><rect class="si-p" x="19" y="8" width="12" height="48"/><rect class="si-f" x="33" y="20" width="10" height="36"/><rect class="si-p" x="45" y="12" width="13" height="44"/><path class="si-l si-t" d="M5 26h12M19 18h12M33 30h10M45 22h13"/><path class="si-l" d="M2 59h60"/>` },
  { id: "computer", name: "Computer", group: "subjects", keywords: "screen laptop technology", body:
    `<rect class="si-f" x="5" y="7" width="54" height="37" rx="5"/><rect class="si-p" x="11" y="13" width="42" height="25" rx="2"/><path class="si-l" d="M32 44v10M20 57h24"/>` },
  { id: "specialist", name: "Specialist", group: "subjects", keywords: "special class teacher", body:
    fig(32, 60, 10) + `<path class="si-l si-t" d="M24 38l8 8 8-8"/><rect class="si-p" x="26" y="46" width="12" height="10" rx="2"/>` },
  // Ways of working
  { id: "independent-work", name: "Independent work", group: "working", keywords: "alone own desk solo", body:
    fig(32, 46, 8) + `<rect class="si-f" x="8" y="40" width="48" height="8" rx="2"/><path class="si-l" d="M14 48v10M50 48v10"/>` },
  { id: "partner-work", name: "Partner work", group: "working", keywords: "pair two buddy", body:
    fig(19, 56, 9) + fig(45, 56, 9) },
  { id: "group-work", name: "Group work", group: "working", keywords: "team table", body:
    fig(32, 38, 8) + fig(16, 58, 9) + fig(48, 58, 9) },
  { id: "quiet-time", name: "Quiet time", group: "working", keywords: "silent no talking mute", body:
    `<path class="si-f" d="M6 24h10l14-12v40L16 40H6z"/><path class="si-l" d="M42 24l16 16M58 24 42 40"/>` },
  { id: "choice-time", name: "Choice time", group: "working", keywords: "choose centers free play", body:
    `<rect class="si-f" x="28" y="3" width="8" height="57"/><path class="si-p" d="M8 12h34l10 8-10 8H8z"/><path class="si-f" d="M56 34H22l-10 8 10 8h34z"/>` },
  { id: "calm-corner", name: "Calm corner", group: "working", keywords: "relax quiet space breathe armchair", body:
    `<rect class="si-f" x="14" y="6" width="36" height="36" rx="10"/><rect class="si-f" x="4" y="28" width="14" height="26" rx="6"/><rect class="si-f" x="46" y="28" width="14" height="26" rx="6"/><rect class="si-p" x="16" y="34" width="32" height="16" rx="4"/><path class="si-l" d="M12 54v6M52 54v6"/>` },
  // Meals and breaks
  { id: "snack", name: "Snack", group: "meals", keywords: "apple fruit", body:
    `<path class="si-l" d="M32 20q1-8 5-12"/><path class="si-p" d="M38 12q8-8 18-4-6 10-18 4z"/><path class="si-f" d="M32 20C26 14 8 16 8 36 8 50 20 60 28 58q4-1 8 0c8 2 20-8 20-22 0-20-18-22-24-16z"/>` },
  { id: "lunch", name: "Lunch", group: "meals", keywords: "eat plate fork knife", body:
    `<circle class="si-f" cx="33" cy="32" r="14"/><circle class="si-l si-t" cx="33" cy="32" r="7"/><path class="si-l si-t" d="M5 6v16M11 6v16M17 6v16M5 22q0 8 6 8t6-8M11 30v28"/><path class="si-f" d="M53 58V6c8 4 8 20 6 28h-6"/>` },
  { id: "recess", name: "Recess", group: "meals", keywords: "playground swing outside play", body:
    `<path class="si-l" d="M4 8h56M10 8 5 58M54 8l5 50"/><path class="si-l si-t" d="M24 8v32M40 8v32"/><rect class="si-f" x="19" y="40" width="26" height="9" rx="3"/>` },
  { id: "break", name: "Break", group: "meals", keywords: "pause rest", body:
    `<circle class="si-f" cx="32" cy="32" r="27"/><rect class="si-k" x="21" y="19" width="6" height="26" rx="2"/><rect class="si-k" x="37" y="19" width="6" height="26" rx="2"/>` },
  // Events
  { id: "assembly", name: "Assembly", group: "events", keywords: "stage show performance", body:
    `<rect class="si-p" x="4" y="14" width="56" height="38"/><rect class="si-f" x="4" y="50" width="56" height="9"/><path class="si-f" d="M4 15h14q0 20-8 35H4zM60 15H46q0 20 8 35h6z"/><rect class="si-f" x="4" y="5" width="56" height="10"/><circle class="si-f" cx="32" cy="28" r="5"/><path class="si-f" d="M24 50v-6a8 8 0 0 1 16 0v6z"/>` },
  { id: "test", name: "Test", group: "events", keywords: "quiz exam assessment", body:
    `<rect class="si-f" x="10" y="4" width="44" height="56" rx="5"/><circle class="si-k" cx="22" cy="18" r="4"/><circle class="si-p si-t" cx="22" cy="32" r="4"/><circle class="si-p si-t" cx="22" cy="46" r="4"/><path class="si-l si-t" d="M32 18h14M32 32h14M32 46h14"/>` },
  { id: "field-trip", name: "Field trip", group: "events", keywords: "outing map place visit", body:
    `<path class="si-f" d="M32 4a15 15 0 0 1 15 15c0 12-15 27-15 27S17 31 17 19A15 15 0 0 1 32 4z"/><circle class="si-p" cx="32" cy="19" r="5"/><circle class="si-k si-n" cx="11" cy="55" r="2.6"/><circle class="si-k si-n" cx="23" cy="58" r="2.6"/><circle class="si-k si-n" cx="35" cy="58" r="2.6"/><circle class="si-k si-n" cx="47" cy="55" r="2.6"/>` },
  { id: "guest", name: "Guest", group: "events", keywords: "visitor hello welcome", body:
    `<path class="si-l" d="M40 38 50 22"/><circle class="si-f" cx="52" cy="18" r="4"/>` + fig(26, 60, 10) },
  { id: "drill", name: "Drill", group: "events", keywords: "fire alarm safety bell", body:
    `<path class="si-l si-t" d="M7 20q-3 8 0 16M57 20q3 8 0 16"/><circle class="si-f" cx="32" cy="11" r="3.5"/><path class="si-f" d="M14 46c4-4 6-10 6-18a12 12 0 0 1 24 0c0 8 2 14 6 18z"/><circle class="si-k" cx="32" cy="53" r="5"/>` },
  { id: "celebration", name: "Celebration", group: "events", keywords: "party balloon birthday", body:
    `<path class="si-l" d="M32 53q-6 3 0 6t0 5"/><ellipse class="si-f" cx="32" cy="26" rx="17" ry="21"/><path class="si-k" d="M32 47l-5 6h10z"/><circle class="si-p si-t" cx="8" cy="12" r="3"/><circle class="si-p si-t" cx="56" cy="10" r="3"/><path class="si-l si-t" d="M54 40l6 3M10 38l-6-3"/>` },
  // The 40th
  { id: "star", name: "Star", group: "events", keywords: "done great", body:
    `<path class="si-f" d="M32 6 38.8 24.7 58.6 25.3 42.9 37.6 48.5 56.7 32 45.5 15.5 56.7 21.1 37.6 5.4 25.3 25.2 24.7z"/>` },
];

export const ICONS: readonly IconDef[] = D;
export const ICON_IDS: readonly string[] = D.map((i) => i.id);
export const iconById = (id: string | undefined): IconDef | undefined => D.find((i) => i.id === id);

/** The markup of one `<symbol>`; defined once in the page and reused with `<use>`. */
export const symbolMarkup = (i: IconDef): string => `<symbol id="si-${i.id}" viewBox="0 0 64 64">${i.body}</symbol>`;
export const spriteMarkup = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" class="sprite" width="0" height="0" aria-hidden="true" focusable="false">${D.map(symbolMarkup).join("")}</svg>`;

const GROUP_COLOR: Record<IconGroup, string> = { routines: "sky", subjects: "lime", working: "violet", meals: "orange", events: "pink" };
/** The palette id used when a card has no color of its own. Same kind of activity, same color. */
export function defaultColorFor(icon: string | undefined): string {
  const d = iconById(icon);
  return d ? (d.id === "star" ? "sun" : GROUP_COLOR[d.group]) : "slate";
}

export function searchIcons(query: string): IconDef[] {
  const toks = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!toks.length) return [...D];
  const hay = (i: IconDef) => `${i.name} ${i.id} ${i.keywords}`.toLowerCase();
  const hits = D.filter((i) => toks.every((t) => hay(i).includes(t)));
  const byName = (i: IconDef) => (toks.every((t) => `${i.name} ${i.id}`.toLowerCase().includes(t)) ? 0 : 1);
  return hits.sort((a, b) => byName(a) - byName(b));
}

export const GROUP_LABELS: Record<IconGroup, string> = {
  routines: "Arrival and routines", subjects: "Subjects", working: "Ways of working", meals: "Meals and breaks", events: "Events",
};

/** A small set of emoji, for anything not in the built in set. */
export const EMOJI_SET: readonly string[] = ["📚", "✏️", "🎒", "🍎", "🧃", "🍽️", "⚽", "🎨", "🎵", "🔬", "🧮", "🚌", "🏠", "🏫", "🛝", "🧩", "🎬", "🧹", "🌳", "🚽", "🎉", "⭐", "🧘", "🎲"];
