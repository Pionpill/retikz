import type { AnyVanillaTier2Adapter } from '@retikz/vanilla';

import { FlexLayoutVanillaAdapter } from '../flex-layout';
import { GridLayoutVanillaAdapter } from '../grid-layout';
import { OverlayLayoutVanillaAdapter } from '../overlay-layout';

/** 三种 Layout 容器的 Vanilla adapter catalog */
export const LayoutVanillaAdapters: ReadonlyArray<AnyVanillaTier2Adapter> = Object.freeze([
  FlexLayoutVanillaAdapter,
  GridLayoutVanillaAdapter,
  OverlayLayoutVanillaAdapter,
]);
