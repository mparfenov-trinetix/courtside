import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { createElement, useState } from 'react';
import { Pressable, StyleSheet, Text, TurboModuleRegistry, useWindowDimensions, View } from 'react-native';

import { Highlights, PlayIcon, Skeleton, SkeletonGroup } from '@/components';
import { useGameVideo } from '@/hooks';
import type { GameVideo, Team } from '@/lib/espn';
import { fonts, palette, radius, textStyle, withAlpha } from '@/lib/theme';
import { youtubeThumbnail, youtubeWatchUrl } from '@/lib/youtube';

/**
 * Loaded when the player is first opened, not at start-up: `react-native-webview` is a native module, and a build made before it was
 * added would fail on it (and `@/features/game` is imported by every screen). Without it the card still opens YouTube.
 */
function loadPlayer(): typeof import('./YouTubePlayer').YouTubePlayer | null {
  if (!TurboModuleRegistry.get('RNCWebViewModule')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('./YouTubePlayer') as typeof import('./YouTubePlayer')).YouTubePlayer;
  } catch {
    return null;
  }
}

const SIDE = 16;

/**
 * A finished game's one highlights section: its video from YouTube, played right on the Summary tab by YouTube's own embedded player (a
 * tap on the picture starts it; the Motion Station channel's recap, found by the two team names, the score and the date in its title), and
 * ESPN's clips of the game in a row under it ("More clips": ESPN's own full-game clip is left out, the video is that). Without a video (the
 * channel puts one up within hours, or has none) the clips stand alone under the title "Highlights"; while it is being looked for, a
 * placeholder of the player's size holds the place. The player's own full-screen button opens iOS's player, which turns with the phone
 * (`useWindowSizeGuard` in the root layout puts the window size right once it is closed).
 */
export function GameHighlights({ gameId, away, home, awayScore, homeScore, date, completed, clips }: { gameId: string; away: Team; home: Team; awayScore: number; homeScore: number; date?: string; completed: boolean; /** ESPN's clips of the game, the ones to show under the video. */ clips: GameVideo[] }) {
  const { width } = useWindowDimensions();
  const height = Math.round(((width - SIDE * 2) * 9) / 16);
  const { data, isPending } = useGameVideo({ id: gameId, awayName: away.name, homeName: home.name, awayScore, homeScore, date }, completed);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lowRes, setLowRes] = useState(false);
  if (!completed) return null;
  if (isPending) {
    return (
      <SkeletonGroup style={styles.wrap}>
        <View style={{ paddingHorizontal: SIDE }}>
          <Skeleton width={120} height={12} style={{ marginBottom: 6 }} />
          <Skeleton height={height} radius={radius.lg} />
        </View>
      </SkeletonGroup>
    );
  }
  if (!data) return <Highlights videos={clips} />;

  const Player = playing ? loadPlayer() : null;
  // A build made before react-native-webview was added cannot play here: say so instead of quietly opening YouTube.
  const noModule = !TurboModuleRegistry.get('RNCWebViewModule');
  const open = () => WebBrowser.openBrowserAsync(youtubeWatchUrl(data.id)).catch(() => {});
  const start = () => {
    setFailed(false);
    if (loadPlayer()) setPlaying(true);
    else open();
  };
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Highlights</Text>
      <View style={[styles.frame, { height }]}>
        {Player && !failed ? (
          createElement(Player, { videoId: data.id, onFailed: () => setFailed(true) })
        ) : (
          <Pressable onPress={start} accessibilityRole="button" accessibilityLabel="Play game highlights" style={StyleSheet.absoluteFill}>
            <Image source={youtubeThumbnail(data.id, lowRes ? 'mq' : 'maxres')} onError={() => setLowRes(true)} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
            <View style={styles.center}>
              {noModule ? (
                <Text style={styles.failed}>This build of the app has no video player yet (it needs a native rebuild). Tap to watch on YouTube.</Text>
              ) : failed ? (
                <Text style={styles.failed}>Couldn’t load the player. Tap to watch on YouTube.</Text>
              ) : (
                <View style={styles.play}>
                  <PlayIcon size={22} color={palette.chalk} />
                </View>
              )}
            </View>
          </Pressable>
        )}
      </View>
      <Highlights title="More clips" videos={clips.filter((c) => !c.fullGame)} tight />
    </View>
  );
}

const styles = StyleSheet.create({
  // The same rhythm as every section of the game tabs: nothing above (the one before has its 14), 14 below.
  wrap: { marginBottom: 14 },
  title: { ...textStyle.sectionLabel, paddingHorizontal: SIDE, marginBottom: 6 },
  frame: { marginHorizontal: SIDE, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000000' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha('#000000', 0.18) },
  play: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha('#000000', 0.55), borderWidth: 1, borderColor: withAlpha('#FFFFFF', 0.4) },
  failed: { fontFamily: fonts.bodySemi, fontSize: 13, color: palette.chalk, textAlign: 'center', paddingHorizontal: 24 },
});
