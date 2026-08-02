import type { AnyVanillaTier2Adapter } from '@retikz/vanilla';

import { AxesVanillaAdapter } from '../axes';
import { FlexLayoutVanillaAdapter } from '../flex-layout';
import { FrameVanillaAdapter } from '../frame';
import { GridVanillaAdapter } from '../grid';
import { GridLayoutVanillaAdapter } from '../grid-layout';
import { LegendVanillaAdapter } from '../legend';
import { OverlayLayoutVanillaAdapter } from '../overlay-layout';

/** 三种 Standard 布局容器的浅冻结 Vanilla adapter 数组 */
export const StandardLayoutVanillaAdapters: ReadonlyArray<AnyVanillaTier2Adapter> = Object.freeze([
  FlexLayoutVanillaAdapter,
  GridLayoutVanillaAdapter,
  OverlayLayoutVanillaAdapter,
]);

/** 当前 Standard 版本全部 Vanilla Tier 2 adapters 的浅冻结便利数组 */
export const StandardVanillaAdapters: ReadonlyArray<AnyVanillaTier2Adapter> = Object.freeze([
  GridVanillaAdapter,
  AxesVanillaAdapter,
  FrameVanillaAdapter,
  ...StandardLayoutVanillaAdapters,
  LegendVanillaAdapter,
]);
