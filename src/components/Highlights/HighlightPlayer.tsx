import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { sharpSource, type GameVideo } from '@/lib/espn';

export type PlayerPhase = 'loading' | 'playing' | 'failed';

/** How long a clip may take to get its first picture before it counts as failed. */
const LOAD_TIMEOUT_MS = 15000;
/** The system player needs this long after it was dismissed before another one can be presented on top of the same screen. */
const REPRESENT_GAP_MS = 500;
let lastExit = 0;

/**
 * The clip in the system's own full-screen video player: its controls, its close button, its rotation, nothing of ours on top.
 *
 * The system player is only presented once the clip has its first picture (`readyToPlay`), so what you wait on is the thumbnail in the
 * row, which shows a loading state, and not a black full-screen player stuck on its first frame (what happened when clips were opened
 * one after the other: every tap built a player that began downloading at once, and a player presented over one still being dismissed
 * never started). A tap on another clip while this one loads only swaps the source of the same player, and expo-video cancels the
 * download in flight. A clip that does not load within `LOAD_TIMEOUT_MS`, or errors, is reported as failed and the system player closes.
 * It plays the stream's sharpest 720p level from the first frame (see `sharpSource`). A clip that ends goes on to the next one. Mounted only while a clip is open, so a player exists only for the clip being watched.
 */
export function HighlightPlayer({
  videos,
  index,
  onIndex,
  onPhase,
  onDismiss,
}: {
  videos: GameVideo[];
  /** The clip to play; changing it swaps the source of the one player. */
  index: number;
  /** A clip ended and the next one starts. */
  onIndex: (index: number) => void;
  onPhase: (phase: PlayerPhase) => void;
  /** The person closed the system player. */
  onDismiss: () => void;
}) {
  const view = useRef<VideoView>(null);
  const fullscreen = useRef(false);
  const failed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The parent's callbacks may be new on every render; reading them through a ref keeps the timer and the listeners below from restarting.
  const callbacks = useRef({ onIndex, onPhase, onDismiss });
  useEffect(() => {
    callbacks.current = { onIndex, onPhase, onDismiss };
  });
  // The stream is played at one sharp level instead of starting blurry at the lowest and climbing (`sharpSource`); the loading state
  // covers the extra moment it takes to read the level list. Until it is known the player has no source.
  const url = videos[index].url;
  const [sharp, setSharp] = useState<{ url: string; source: string } | null>(null);
  useEffect(() => {
    let current = true;
    sharpSource(url).then((source) => {
      if (current) setSharp({ url, source });
    });
    return () => {
      current = false;
    };
  }, [url]);
  const player = useVideoPlayer(sharp?.url === url ? sharp.source : null, (p) => {
    // A short clip is buffered whole, ahead of where it is playing: a skip forward finds its picture already there.
    p.bufferOptions = { preferredForwardBufferDuration: 60 };
  });

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const fail = useCallback(() => {
    if (failed.current) return;
    failed.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    player.pause();
    callbacks.current.onPhase('failed');
    // Close the system player if it is up; `onFullscreenExit` then knows it was not the person who did.
    if (fullscreen.current) view.current?.exitFullscreen().catch(() => {});
  }, [player]);

  // Each clip gets its time to load, whether it is the first one or the one after a clip that ended.
  useEffect(() => {
    failed.current = false;
    timer.current = setTimeout(fail, LOAD_TIMEOUT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [index, fail]);

  const present = useCallback(async () => {
    // Already up (a clip after a clip that ended): the same system player just plays on.
    if (fullscreen.current) {
      player.play();
      callbacks.current.onPhase('playing');
      return;
    }
    const wait = REPRESENT_GAP_MS - (Date.now() - lastExit);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    // The view is laid out by now (the clip took longer to load than a frame), but one retry costs nothing.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await view.current?.enterFullscreen();
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
    fail();
  }, [fail, player]);

  useEventListener(player, 'statusChange', ({ status }) => {
    if (failed.current) return;
    if (status === 'readyToPlay') {
      clearTimer();
      present();
    } else if (status === 'error') {
      fail();
    }
  });
  useEventListener(player, 'playToEnd', () => {
    if (index < videos.length - 1) callbacks.current.onIndex(index + 1);
  });

  return (
    <VideoView
      ref={view}
      player={player}
      style={styles.hidden}
      nativeControls
      // Rotation is the system player's own: its view controller allows landscape while the rest of the app stays locked to portrait.
      fullscreenOptions={{ enable: true, orientation: 'default' }}
      allowsPictureInPicture={false}
      onFullscreenEnter={() => {
        fullscreen.current = true;
        player.play();
        callbacks.current.onPhase('playing');
      }}
      onFullscreenExit={() => {
        fullscreen.current = false;
        lastExit = Date.now();
        player.pause();
        if (!failed.current) callbacks.current.onDismiss();
      }}
    />
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
