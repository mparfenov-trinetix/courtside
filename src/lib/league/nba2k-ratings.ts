/**
 * NBA 2K27's Top 100 overall ratings, as 2K Ratings (https://www.2kratings.com/lists/top-100-highest-nba-2k-ratings) lists them:
 * the game's current ratings, which move when 2K updates them during the season, copied on 2026-11-08 (9 players out and 9 in since
 * the launch list on https://nba.2k.com/2k27/top-100-ratings/, and 29 ratings changed). These are the real numbers and the only ones
 * there are: there is no public feed for the rest of the league or for the attributes, so a player outside the Top 100 has no
 * rating here. To refresh, open that page, read the 100 rows (rank, name, overall) and replace the list below. Names keep the spelling
 * ESPN uses, which `keyOf` matches (accents and punctuation do not matter, "Alexandre" and "Alex" do). In rank order (ties keep the list's order).
 */
const TOP_100: [name: string, overall: number][] = [
  ['Shai Gilgeous-Alexander', 97],
  ['Victor Wembanyama', 97],
  ['Luka Dončić', 97],
  ['Nikola Jokić', 96],
  ['Giannis Antetokounmpo', 96],
  ['Jalen Brunson', 95],
  ['Anthony Edwards', 95],
  ['Stephen Curry', 95],
  ['Cade Cunningham', 94],
  ['Kevin Durant', 93],
  ['Kawhi Leonard', 93],
  ['Jayson Tatum', 93],
  ['Donovan Mitchell', 93],
  ['Karl-Anthony Towns', 93],
  ['Tyrese Maxey', 93],
  ['Jaylen Brown', 92],
  ['LeBron James', 91],
  ['Joel Embiid', 91],
  ['Devin Booker', 91],
  ['Anthony Davis', 91],
  ['Tyrese Haliburton', 90],
  ['Cooper Flagg', 90],
  ['Jamal Murray', 89],
  ['Alperen Şengün', 89],
  ['Scottie Barnes', 88],
  ['OG Anunoby', 88],
  ['Deni Avdija', 88],
  ['Austin Reaves', 88],
  ['Evan Mobley', 88],
  ['Trae Young', 88],
  ['Kyrie Irving', 88],
  ['Paolo Banchero', 87],
  ['Jalen Johnson', 87],
  ['Bam Adebayo', 87],
  ['Pascal Siakam', 87],
  ['James Harden', 86],
  ['Stephon Castle', 86],
  ['LaMelo Ball', 86],
  ['Jaren Jackson Jr.', 86],
  ['Amen Thompson', 86],
  ['Chet Holmgren', 86],
  ['Damian Lillard', 86],
  ['Zion Williamson', 86],
  ['Domantas Sabonis', 86],
  ['Jarrett Allen', 86],
  ['Ty Jerome', 86],
  ['Jalen Duren', 85],
  ['Jalen Williams', 85],
  ['Jimmy Butler', 85],
  ['Franz Wagner', 85],
  ['Dylan Harper', 85],
  ['Jaden McDaniels', 85],
  ['Ausar Thompson', 85],
  ['Tyler Herro', 85],
  ['Brandon Miller', 85],
  ['Lauri Markkanen', 84],
  ['Michael Porter Jr.', 84],
  ['De\'Aaron Fox', 84],
  ['Rudy Gobert', 84],
  ['Ja Morant', 84],
  ['Brandon Ingram', 84],
  ['Norman Powell', 84],
  ['Darius Garland', 84],
  ['Kon Knueppel', 84],
  ['Ivica Zubac', 84],
  ['Keyonte George', 84],
  ['Nickeil Alexander-Walker', 84],
  ['Paul George', 84],
  ['Ajay Mitchell', 84],
  ['Donovan Clingan', 84],
  ['Walker Kessler', 84],
  ['Derrick White', 83],
  ['Julius Randle', 83],
  ['CJ McCollum', 83],
  ['Zach LaVine', 83],
  ['R.J. Barrett', 83],
  ['Dejounte Murray', 83],
  ['Cameron Boozer', 83],
  ['Darius Acuff Jr.', 83],
  ['Yaxel Lendeborg', 83],
  ['Trey Murphy III', 82],
  ['Desmond Bane', 82],
  ['V.J. Edgecombe', 82],
  ['Naz Reid', 82],
  ['Isaiah Hartenstein', 82],
  ['Dillon Brooks', 82],
  ['Payton Pritchard', 82],
  ['Immanuel Quickley', 82],
  ['Dyson Daniels', 82],
  ['Ayo Dosunmu', 82],
  ['Toumani Camara', 82],
  ['Jabari Smith Jr.', 82],
  ['Andrew Nembhard', 82],
  ['Anthony Black', 82],
  ['Caleb Wilson', 82],
  ['Josh Giddey', 81],
  ['Aaron Gordon', 81],
  ['Alex Sarr', 81],
  ['Josh Hart', 81],
  ['Jrue Holiday', 81],
];

/** "Nikola Jokić" and "Nikola Jokic", "V.J. Edgecombe" and "VJ Edgecombe" are the same person. */
const keyOf = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

const BY_NAME = new Map(TOP_100.map(([name, overall], i) => [keyOf(name), { name, overall, rank: i + 1 }]));

export type Nba2kRating = { name: string; overall: number; rank: number };

/** The player's NBA 2K27 overall and rank, or null when he is not in 2K's published Top 100. */
export const nba2kRating = (name: string | undefined | null): Nba2kRating | null => (name ? (BY_NAME.get(keyOf(name)) ?? null) : null);

export const NBA2K_TOP_COUNT = TOP_100.length;
