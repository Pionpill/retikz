import type { SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { ArrayInputEmbedAdapter } from '../collection/array';
import { ChainInputEmbedAdapter } from '../collection/chain';
import { MapInputEmbedAdapter } from '../collection/map';
import { MatrixInputEmbedAdapter } from '../collection/matrix';
import { AxesInputEmbedAdapter } from '../presentation/axes';
import { FrameInputEmbedAdapter } from '../presentation/frame';
import { GridInputEmbedAdapter } from '../presentation/grid';
import { LegendInputEmbedAdapter } from '../presentation/legend';
import { SurfaceInputEmbedAdapter } from '../presentation/surface';
import {
  CircleInputEmbedAdapter,
  EllipseInputEmbedAdapter,
  RectangleInputEmbedAdapter,
  PolygonInputEmbedAdapter,
  StarInputEmbedAdapter,
  ArcInputEmbedAdapter,
  SectorInputEmbedAdapter,
} from '../shape';

/** 当前 Standard 版本全部 InputEmbed adapter 的 catalog */
export const StandardInputEmbedAdapters: ReadonlyArray<SynchronousInputEmbedAdapter<never>> = Object.freeze([
  ChainInputEmbedAdapter,
  MatrixInputEmbedAdapter,
  MapInputEmbedAdapter,
  ArrayInputEmbedAdapter,
  GridInputEmbedAdapter,
  AxesInputEmbedAdapter,
  FrameInputEmbedAdapter,
  SurfaceInputEmbedAdapter,
  LegendInputEmbedAdapter,
  CircleInputEmbedAdapter,
  EllipseInputEmbedAdapter,
  RectangleInputEmbedAdapter,
  PolygonInputEmbedAdapter,
  StarInputEmbedAdapter,
  ArcInputEmbedAdapter,
  SectorInputEmbedAdapter,
]);
