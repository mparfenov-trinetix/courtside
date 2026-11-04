import type { ComponentType } from 'react';
import type { Href } from 'expo-router';

export const DRAWER_WIDTH = 300;
/** How round the screen's left corners get as the menu opens. */
export const SCENE_RADIUS = 28;

export type MenuItem = {
  route: string;
  href: Href;
  label: string;
  Icon: ComponentType<{ color: string; size?: number; filled?: boolean }>;
};

export type MenuSection = { title: string; items: MenuItem[] };
