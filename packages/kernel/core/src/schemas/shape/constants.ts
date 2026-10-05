import type { ValueOf } from '@retikz/foundation';
/** Core 内置 shape 名称 */
export const BuiltinShape = {
  Rectangle: 'rectangle',
  Circle: 'circle',
  Ellipse: 'ellipse',
  Diamond: 'diamond',
  Polygon: 'polygon',
} as const;

/** Core 内置 shape 名联合 */
export type BuiltinShape = ValueOf<typeof BuiltinShape>;
