import type { ShapeDefinition } from '../../contract/shape';
import type { BuiltinShapeValue } from '../../schemas';

import { defineBuiltinProviderArray, resolveProviderRegistry } from '../registry';
import { arc } from './arc';
import { contour } from './contour';
import { ellipse } from './ellipse';
import { polygon } from './polygon';
import { rectangle } from './rectangle';
import { sector } from './sector';
import { star } from './star';

export type BuiltinShapeProviderName = Exclude<BuiltinShapeValue, 'circle' | 'diamond'> | 'sector' | 'arc' | 'polygon' | 'star' | 'contour';

/** 内置 shape 注册项（circle / diamond 已收为 preset，不占独立项）。 */
export const BUILTIN_SHAPES = defineBuiltinProviderArray<ShapeDefinition, BuiltinShapeProviderName>([
  rectangle,
  ellipse,
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
    optionName: 'shapes',
  });
