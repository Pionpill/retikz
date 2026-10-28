import type { InputEmbed } from '@retikz/vanilla';

import type { InputCircle } from './circle';
import { circleInputEmbedAdapter } from './circle';

export * from './circle';
import type { InputEllipse } from './ellipse';
import { ellipseInputEmbedAdapter } from './ellipse';

export * from './ellipse';
import type { InputRectangle } from './rectangle';
import { rectangleInputEmbedAdapter } from './rectangle';

export * from './rectangle';
import type { InputPolygon } from './polygon';
import { polygonInputEmbedAdapter } from './polygon';

export * from './polygon';
import type { InputStar } from './star';
import { starInputEmbedAdapter } from './star';

export * from './star';
import type { InputArc } from './arc';
import { arcInputEmbedAdapter } from './arc';

export * from './arc';
import type { InputSector } from './sector';
import { sectorInputEmbedAdapter } from './sector';

export * from './sector';
/** Standard 形状家族的 Vanilla 作者入口 */
export const shape = Object.freeze({
  /** 创建 Circle，显式身份同时用于 embed 与最终路径 */
  circle: (input: InputCircle): InputEmbed<InputCircle> => ({
    type: 'embed',
    kind: circleInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 Ellipse，显式身份同时用于 embed 与最终路径 */
  ellipse: (input: InputEllipse): InputEmbed<InputEllipse> => ({
    type: 'embed',
    kind: ellipseInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 Rectangle，显式身份同时用于 embed 与最终路径 */
  rectangle: (input: InputRectangle): InputEmbed<InputRectangle> => ({
    type: 'embed',
    kind: rectangleInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 Polygon，显式身份同时用于 embed 与最终路径 */
  polygon: (input: InputPolygon): InputEmbed<InputPolygon> => ({
    type: 'embed',
    kind: polygonInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 Star，显式身份同时用于 embed 与最终路径 */
  star: (input: InputStar): InputEmbed<InputStar> => ({
    type: 'embed',
    kind: starInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 Arc，显式身份同时用于 embed 与最终路径 */
  arc: (input: InputArc): InputEmbed<InputArc> => ({
    type: 'embed',
    kind: arcInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 Sector，显式身份同时用于 embed 与最终路径 */
  sector: (input: InputSector): InputEmbed<InputSector> => ({
    type: 'embed',
    kind: sectorInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
});
