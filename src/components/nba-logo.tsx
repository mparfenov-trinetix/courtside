import { Image } from 'expo-image';

/** ESPN's NBA logo, the variant made for dark backgrounds. */
const NBA_LOGO = 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500-dark/nba.png&w=500&h=500&transparent=true';

export function NbaLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={NBA_LOGO}
      style={{ width: size * 0.5, height: size }}
      contentFit="contain"
      accessibilityLabel="NBA"
    />
  );
}
