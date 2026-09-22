import type { AnyInputEmbedAdapter } from '@retikz/vanilla';

import { ListInputEmbedAdapter } from '../container/list';
import { MapInputEmbedAdapter } from '../container/map';
import { AxesInputEmbedAdapter } from '../presentation/axes';
import { FrameInputEmbedAdapter } from '../presentation/frame';
import { GridInputEmbedAdapter } from '../presentation/grid';
import { LegendInputEmbedAdapter } from '../presentation/legend';
import { SurfaceInputEmbedAdapter } from '../presentation/surface';
import {
  CircleInputEmbedAdapter,
  EllipseInputEmbedAdapter,
  RectangleInputEmbedAdapter,
  RegularPolygonInputEmbedAdapter,
  StarInputEmbedAdapter,
  ArcInputEmbedAdapter,
  SectorInputEmbedAdapter,
} from '../shape';

/** 当前 Standard 版本全部 InputEmbed adapter 的 catalog */
export const StandardInputEmbedAdapters: ReadonlyArray<AnyInputEmbedAdapter> = Object.freeze([
  MapInputEmbedAdapter,
  ListInputEmbedAdapter,
  GridInputEmbedAdapter,
  AxesInputEmbedAdapter,
  FrameInputEmbedAdapter,
  SurfaceInputEmbedAdapter,
  LegendInputEmbedAdapter,
  CircleInputEmbedAdapter,
  EllipseInputEmbedAdapter,
  RectangleInputEmbedAdapter,
  RegularPolygonInputEmbedAdapter,
  StarInputEmbedAdapter,
  ArcInputEmbedAdapter,
  SectorInputEmbedAdapter,
]);
