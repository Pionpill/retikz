import type { ValueOf } from '@retikz/foundation';

/** Standard 提供的可选形状 provider 名称 */
export const StandardShapeName = {
  Contour: 'contour',
  Cross: 'cross',
  Sector: 'sector',
  Star: 'star',
} as const;

/** Standard 形状 provider 名称取值 */
export type StandardShapeNameValue = ValueOf<typeof StandardShapeName>;
