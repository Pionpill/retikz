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
  circle: (id: string, input: InputCircle): InputEmbed<InputCircle & { id: string }> => ({
    type: 'embed',
    kind: CircleInputEmbedAdapter.kind,
    id,
    props: { ...input, id },
  }),
  /** 创建 Ellipse，显式身份同时用于 embed 与最终路径 */
  ellipse: (id: string, input: InputEllipse): InputEmbed<InputEllipse & { id: string }> => ({
    type: 'embed',
    kind: EllipseInputEmbedAdapter.kind,
    id,
    props: { ...input, id },
  }),
  /** 创建 Rectangle，显式身份同时用于 embed 与最终路径 */
  rectangle: (id: string, input: InputRectangle): InputEmbed<InputRectangle & { id: string }> => ({
    type: 'embed',
    kind: RectangleInputEmbedAdapter.kind,
    id,
    props: { ...input, id },
  }),
  /** 创建 RegularPolygon，显式身份同时用于 embed 与最终路径 */
  regularPolygon: (id: string, input: InputRegularPolygon): InputEmbed<InputRegularPolygon & { id: string }> => ({
    type: 'embed',
    kind: RegularPolygonInputEmbedAdapter.kind,
    id,
    props: { ...input, id },
  }),
  /** 创建 Star，显式身份同时用于 embed 与最终路径 */
  star: (id: string, input: InputStar): InputEmbed<InputStar & { id: string }> => ({
    type: 'embed',
    kind: StarInputEmbedAdapter.kind,
    id,
    props: { ...input, id },
  }),
  /** 创建 Arc，显式身份同时用于 embed 与最终路径 */
  arc: (id: string, input: InputArc): InputEmbed<InputArc & { id: string }> => ({
    type: 'embed',
    kind: ArcInputEmbedAdapter.kind,
    id,
    props: { ...input, id },
  }),
  /** 创建 Sector，显式身份同时用于 embed 与最终路径 */
  sector: (id: string, input: InputSector): InputEmbed<InputSector & { id: string }> => ({
    type: 'embed',
    kind: SectorInputEmbedAdapter.kind,
    id,
    props: { ...input, id },
  }),
});
