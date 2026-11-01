/** Soft warning only. True when the text has two capitalized words in a row on one line
 *  that could be a name ("Maria Lopez"). All-caps words like IEP are ignored.
 *  The first word may open a sentence (a name can start one); the second never can,
 *  because a sentence break between them (". ") stops the match. */
export function maybeContainsName(text: string): boolean {
  return /\b[A-Z][a-z]+[ \t]+[A-Z][a-z]+\b/.test(text);
}
