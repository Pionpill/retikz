import type { AnyInputEmbedAdapter } from '@retikz/vanilla';

import { AxesInputEmbedAdapter } from '../axes';
import { FrameInputEmbedAdapter } from '../frame';
import { GridInputEmbedAdapter } from '../grid';
import { LegendInputEmbedAdapter } from '../legend';
import { SurfaceInputEmbedAdapter } from '../surface';

/** 当前 Standard 版本全部 InputEmbed adapter 的 catalog */
export const StandardInputEmbedAdapters: ReadonlyArray<AnyInputEmbedAdapter> = Object.freeze([
  GridInputEmbedAdapter,
  AxesInputEmbedAdapter,
  FrameInputEmbedAdapter,
  SurfaceInputEmbedAdapter,
  LegendInputEmbedAdapter,
]);
