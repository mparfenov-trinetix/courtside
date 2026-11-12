const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;

const words = (name: string) => name.trim().split(/\s+/).filter(Boolean);

/** "Jaren Jackson Jr." -> "Jackson"; "Karl-Anthony Towns" -> "Towns"; "Nickeil Alexander-Walker" -> "Alexander-Walker". */
export function lastNameOf(name: string): string {
  const w = words(name).filter((x, i, all) => !(i === all.length - 1 && all.length > 1 && SUFFIX.test(x)));
  return w[w.length - 1] ?? name;
}

/**
 * How many letters the two last names may have together for the whole group (an avatar, a name, the VS, a name, an avatar) to fit centered in the
 * header at full size: about 7.7 pt a letter, 262 pt of room beside the back button. It is the two together, not either one: a long name beside a
 * short one (Antetokounmpo and James, 18) fits at full size where two long ones (Wembanyama and Antetokounmpo, 23) do not.
 */
const FULL_SIZE_LETTERS = 20;
/** The smallest share of full size the names are drawn at (Gilgeous-Alexander and Alexander-Walker, 34 letters, come to 0.59). */
const MIN_SCALE = 0.5;

/**
 * The font size of both names as a share of full size: 1 when the two last names fit together, otherwise both smaller by the same factor, so the
 * pair always reads as a pair (one size, never one shrunk beside a big one) and nothing is cut.
 */
export function namesScale(aName: string, bName: string): number {
  const letters = lastNameOf(aName).length + lastNameOf(bName).length;
  return letters <= FULL_SIZE_LETTERS ? 1 : Math.max(MIN_SCALE, FULL_SIZE_LETTERS / letters);
}
