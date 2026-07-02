import type { ShapeDefinition } from '../../contract';
import type { BuiltinShapeValue } from '../../schemas';

import { defineBuiltinProviderArray, resolveProviderRegistry } from '../registry';
import { arc } from './arc';
import { contour } from './contour';
import { ellipseShape } from './ellipse';
import { polygon } from './polygon';
import { rectangle } from './rectangle';
import { sector } from './sector';
import { star } from './star';

/** 内置 shape provider 名称；`circle` / `diamond` 是 shape preset，不占 provider key。 */
export type BuiltinShapeProviderName =
  | Exclude<BuiltinShapeValue, 'circle' | 'diamond'>
  | 'sector'
  | 'arc'
  | 'polygon'
  | 'star'
  | 'contour';

/** 内置 shape provider 注册项；circle / diamond 是 IR 内置 shape preset，不占独立 provider key。 */
export const BUILTIN_SHAPES = defineBuiltinProviderArray<ShapeDefinition, BuiltinShapeProviderName>([
  rectangle,
  ellipseShape,
  sector,
  arc,
  polygon,
  star,
  contour,
]);

export const resolveShapeRegistry = (shapes?: ReadonlyArray<ShapeDefinition>): ReadonlyMap<string, ShapeDefinition> =>
  resolveProviderRegistry({
    capability: 'shape',
    builtins: BUILTIN_SHAPES,
    custom: shapes,
    keyOf: definition => definition.name,
  });
