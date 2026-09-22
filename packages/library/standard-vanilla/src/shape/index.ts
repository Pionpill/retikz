import type { InputEmbed } from '@retikz/vanilla';

import type { InputCircle } from './circle';
import { CircleInputEmbedAdapter } from './circle';

export * from './circle';
import type { InputEllipse } from './ellipse';
import { EllipseInputEmbedAdapter } from './ellipse';

export * from './ellipse';
import type { InputRectangle } from './rectangle';
import { RectangleInputEmbedAdapter } from './rectangle';

export * from './rectangle';
import type { InputRegularPolygon } from './regular-polygon';
import { RegularPolygonInputEmbedAdapter } from './regular-polygon';

export * from './regular-polygon';
import type { InputStar } from './star';
import { StarInputEmbedAdapter } from './star';

export * from './star';
import type { InputArc } from './arc';
import { ArcInputEmbedAdapter } from './arc';

export * from './arc';
import type { InputSector } from './sector';
import { SectorInputEmbedAdapter } from './sector';

export * from './sector';
/** Standard 形状家族的 Vanilla 作者入口 */
export const shape = Object.freeze({
  /** 创建 Circle，显式身份同时用于 embed 与最终路径 */
  circle: (input: InputCircle): InputEmbed<InputCircle> => ({
    type: 'embed',
    kind: CircleInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 Ellipse，显式身份同时用于 embed 与最终路径 */
  ellipse: (input: InputEllipse): InputEmbed<InputEllipse> => ({
    type: 'embed',
    kind: EllipseInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 Rectangle，显式身份同时用于 embed 与最终路径 */
  rectangle: (input: InputRectangle): InputEmbed<InputRectangle> => ({
    type: 'embed',
    kind: RectangleInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 RegularPolygon，显式身份同时用于 embed 与最终路径 */
  regularPolygon: (input: InputRegularPolygon): InputEmbed<InputRegularPolygon> => ({
    type: 'embed',
    kind: RegularPolygonInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 Star，显式身份同时用于 embed 与最终路径 */
  star: (input: InputStar): InputEmbed<InputStar> => ({
    type: 'embed',
    kind: StarInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 Arc，显式身份同时用于 embed 与最终路径 */
  arc: (input: InputArc): InputEmbed<InputArc> => ({
    type: 'embed',
    kind: ArcInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
  /** 创建 Sector，显式身份同时用于 embed 与最终路径 */
  sector: (input: InputSector): InputEmbed<InputSector> => ({
    type: 'embed',
    kind: SectorInputEmbedAdapter.kind,
    ...(input.id === undefined ? {} : { id: input.id }),
    props: input,
  }),
});
