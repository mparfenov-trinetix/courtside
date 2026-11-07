/**
 * NBA 2K27's published Top 100 overall ratings, as 2K released them (https://nba.2k.com/2k27/top-100-ratings/, also announced on
 * NBA.com). These are the real numbers and the only ones 2K publishes: there is no public feed for the rest of the league or for
 * the attributes, and 2K updates ratings during the season, so these are the launch ratings (checked against 2K's page on 2026-11-06: the same 100 players and numbers). Names are spelled as 2K's page spells them, which is how ESPN does. In rank order (ties keep 2K's order).
 */
const TOP_100: [name: string, overall: number][] = [
  ['Shai Gilgeous-Alexander', 97],
  ['Victor Wembanyama', 97],
  ['Nikola Jokić', 97],
  ['Luka Dončić', 97],
  ['Jalen Brunson', 96],
  ['Giannis Antetokounmpo', 96],
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
  ['Tyrese Haliburton', 90],
  ['Anthony Davis', 90],
  ['Cooper Flagg', 90],
  ['Jamal Murray', 89],
  ['Scottie Barnes', 88],
  ['OG Anunoby', 88],
  ['Deni Avdija', 88],
  ['Austin Reaves', 88],
  ['Trae Young', 88],
  ['Kyrie Irving', 88],
  ['Paolo Banchero', 87],
  ['Jalen Johnson', 87],
  ['Bam Adebayo', 87],
  ['Pascal Siakam', 87],
  ['James Harden', 87],
  ['Evan Mobley', 87],
  ['Alperen Şengün', 87],
  ['Stephon Castle', 87],
  ['Lauri Markkanen', 86],
  ['LaMelo Ball', 86],
  ['Jaren Jackson Jr.', 86],
  ['Amen Thompson', 86],
  ['Chet Holmgren', 86],
  ['Damian Lillard', 86],
  ['Jalen Duren', 85],
  ['Jalen Williams', 85],
  ['Jimmy Butler', 85],
  ['Trey Murphy III', 85],
  ['Franz Wagner', 85],
  ['Michael Porter Jr.', 85],
  ['Zion Williamson', 85],
  ['Dylan Harper', 85],
  ['Jaden McDaniels', 85],
  ['Ausar Thompson', 85],
  ['Tyler Herro', 85],
  ['Domantas Sabonis', 85],
  ['Jarrett Allen', 85],
  ['Brandon Miller', 85],
  ['De\'Aaron Fox', 84],
  ['Rudy Gobert', 84],
  ['Ja Morant', 84],
  ['Brandon Ingram', 84],
  ['Josh Giddey', 84],
  ['Norman Powell', 84],
  ['Darius Garland', 84],
  ['Desmond Bane', 84],
  ['Kon Knueppel', 84],
  ['Ivica Zubac', 84],
  ['Mikal Bridges', 84],
  ['Keyonte George', 84],
  ['Paul George', 84],
  ['Nickeil Alexander-Walker', 83],
  ['Derrick White', 83],
  ['Aaron Gordon', 83],
  ['Julius Randle', 83],
  ['CJ McCollum', 83],
  ['V.J. Edgecombe', 83],
  ['Alex Sarr', 83],
  ['DeMar DeRozan', 83],
  ['Josh Hart', 82],
  ['Naz Reid', 82],
  ['Jrue Holiday', 82],
  ['Isaiah Hartenstein', 82],
  ['Ajay Mitchell', 82],
  ['Dillon Brooks', 82],
  ['Payton Pritchard', 82],
  ['Zach LaVine', 82],
  ['R.J. Barrett', 82],
  ['Dejounte Murray', 82],
  ['Donovan Clingan', 82],
  ['Immanuel Quickley', 82],
  ['Cason Wallace', 81],
  ['Matas Buzelis', 81],
  ['Alex Caruso', 81],
  ['Dyson Daniels', 81],
  ['Ayo Dosunmu', 81],
  ['Shaedon Sharpe', 81],
  ['Onyeka Okongwu', 81],
  ['Devin Vassell', 81],
  ['Tobias Harris', 81],
  ['Walker Kessler', 81],
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
