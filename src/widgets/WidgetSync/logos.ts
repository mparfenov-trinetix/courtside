/** Where a logo lives inside the shared widget folder; null while there is nowhere to put it. */
const fileNameOf = (url: string) => `logo-${url.replace(/[^a-z0-9]+/gi, '_').slice(-80)}.png`;

/** ESPN's resizer: the widget only ever shows a logo ~50pt wide (a headshot ~30pt), so don't make it decode 500px. */
const small = (url: string) => {
  const logo = url.match(/^https?:\/\/a\.espncdn\.com(\/i\/teamlogos\/.+)$/)?.[1];
  if (logo) return `https://a.espncdn.com/combiner/i?img=${logo}&w=160&h=160`;
  const head = url.match(/^https?:\/\/a\.espncdn\.com(\/i\/headshots\/.+)$/)?.[1];
  return head ? `https://a.espncdn.com/combiner/i?img=${head}&w=160&h=117` : url;
};

/**
 * Widgets can't read the app's sandbox or fetch anything, so each logo is downloaded once into the shared
 * widget folder. Resolves url -> file URI for the ones that made it; the rest simply show text instead.
 */
export async function shareLogos(urls: string[]): Promise<Record<string, string>> {
  // Lazy: both modules resolve native code, which Expo Go and web don't have.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { File } = require('expo-file-system') as typeof import('expo-file-system');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { widgetsDirectory } = require('expo-widgets') as typeof import('expo-widgets');
  if (!widgetsDirectory) return {};

  const out: Record<string, string> = {};
  await Promise.all(
    [...new Set(urls.filter(Boolean))].map(async (url) => {
      try {
        const file = new File(widgetsDirectory, fileNameOf(url));
        if (!file.exists) await File.downloadFileAsync(small(url), file);
        out[url] = file.uri;
      } catch {
        // Offline or blocked: this logo falls back to the team abbreviation.
      }
    }),
  );
  return out;
}
