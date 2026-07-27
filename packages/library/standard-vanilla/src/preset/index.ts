import type { AnyVanillaTier2Adapter } from '@retikz/vanilla';

import { AxesVanillaAdapter } from '../axes';
import { FrameVanillaAdapter } from '../frame';
import { GridVanillaAdapter } from '../grid';

/** 当前 Standard 版本全部 Vanilla Tier 2 adapters 的浅冻结便利数组 */
export const StandardVanillaAdapters: ReadonlyArray<AnyVanillaTier2Adapter> = Object.freeze([
  GridVanillaAdapter,
  AxesVanillaAdapter,
  FrameVanillaAdapter,
]);
