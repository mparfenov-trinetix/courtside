import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';

import { youtubeWatchUrl } from '@/lib/youtube';

/** The page that holds the iframe claims to be the app (YouTube answers a page that claims to be youtube.com with error 152, and one with no referrer with 153). */
const ORIGIN = 'https://com.mykolaparfenov.courtsideapp';

const playerHtml = (videoId: string) =>
  `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&fs=1&origin=${encodeURIComponent(ORIGIN)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`;

/**
 * YouTube's own embed (the iframe player) in a WebView, sized by its parent. The page is given as HTML with the app's own origin as base URL
 * and in the player's `origin` parameter: the embed address loaded on its own sends no referrer and YouTube refuses it (error 153), and a page
 * that says it is youtube.com is refused too (152). It starts playing at once (the tap on the thumbnail was the user's), inline. The player's
 * full-screen button takes the video into iOS's own player, which turns with the phone either way (the app's window size is put right
 * afterwards by `useWindowSizeGuard`). A link out of the player (its logo, "Watch on YouTube") opens in the system, never inside the card.
 */
export function YouTubePlayer({ videoId, onFailed }: { videoId: string; onFailed: () => void }) {
  return (
    <WebView
      source={{ html: playerHtml(videoId), baseUrl: ORIGIN }}
      originWhitelist={['https://*', 'about:*']}
      style={{ flex: 1, backgroundColor: '#000000' }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      scrollEnabled={false}
      bounces={false}
      javaScriptEnabled
      onError={onFailed}
      onHttpError={onFailed}
      onShouldStartLoadWithRequest={(request) => {
        // Only the page itself and the player's iframe load here. Anything else the viewer reaches (the logo, a title, "Watch on YouTube")
        // opens in the system: loaded in the card it showed YouTube's mobile site, whose own full-screen player then rotated the app.
        if (request.isTopFrame === false || request.url === 'about:blank' || request.url.startsWith(ORIGIN)) return true;
        Linking.openURL(youtubeWatchUrl(videoId)).catch(() => {});
        return false;
      }}
    />
  );
}
