import type { SynchronousInputEmbedAdapter } from '@retikz/vanilla';

import { treeInputEmbedAdapter } from '../collection';
import { arrayInputEmbedAdapter } from '../collection/array';
import { chainInputEmbedAdapter } from '../collection/chain';
import { mapInputEmbedAdapter } from '../collection/map';
import { matrixInputEmbedAdapter } from '../collection/matrix';
import { queueInputEmbedAdapter } from '../collection/queue';
import { stackInputEmbedAdapter } from '../collection/stack';
import { axesInputEmbedAdapter } from '../presentation/axes';
import { frameInputEmbedAdapter } from '../presentation/frame';
import { gridInputEmbedAdapter } from '../presentation/grid';
import { legendInputEmbedAdapter } from '../presentation/legend';
import { surfaceInputEmbedAdapter } from '../presentation/surface';
import {
  circleInputEmbedAdapter,
  ellipseInputEmbedAdapter,
  rectangleInputEmbedAdapter,
  polygonInputEmbedAdapter,
  starInputEmbedAdapter,
  arcInputEmbedAdapter,
  sectorInputEmbedAdapter,
} from '../shape';

/** 当前 Standard 版本全部 InputEmbed adapter 的 catalog */
export const standardInputEmbedAdapters: ReadonlyArray<SynchronousInputEmbedAdapter<never>> = Object.freeze([
  treeInputEmbedAdapter,
  queueInputEmbedAdapter,
  stackInputEmbedAdapter,
  chainInputEmbedAdapter,
  matrixInputEmbedAdapter,
  mapInputEmbedAdapter,
  arrayInputEmbedAdapter,
  gridInputEmbedAdapter,
  axesInputEmbedAdapter,
  frameInputEmbedAdapter,
  surfaceInputEmbedAdapter,
  legendInputEmbedAdapter,
  circleInputEmbedAdapter,
  ellipseInputEmbedAdapter,
  rectangleInputEmbedAdapter,
  polygonInputEmbedAdapter,
  starInputEmbedAdapter,
  arcInputEmbedAdapter,
  sectorInputEmbedAdapter,
]);
