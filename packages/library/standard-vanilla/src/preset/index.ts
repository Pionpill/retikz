import type { AnyVanillaTier2Adapter } from '@retikz/vanilla';

import { AxesVanillaAdapter } from '../axes';
import { FrameVanillaAdapter } from '../frame';
import { GridVanillaAdapter } from '../grid';
import { LegendVanillaAdapter } from '../legend';
import { SurfaceVanillaAdapter } from '../surface';

/** 当前 Standard 版本全部 Vanilla Tier 2 adapters 的 catalog */
export const StandardVanillaAdapters: ReadonlyArray<AnyVanillaTier2Adapter> = Object.freeze([
  GridVanillaAdapter,
  AxesVanillaAdapter,
  FrameVanillaAdapter,
  SurfaceVanillaAdapter,
  LegendVanillaAdapter,
]);
