import type { ShapeDefinition } from '../../contract';
import type { BuiltinShape } from '../../schemas';

import { defineBuiltinProviderArray } from '../registry/index';
import { ellipseShape } from './ellipse';
import { polygon } from './polygon';
import { rectangle } from './rectangle';

/** 内置 shape provider 名称；`circle` / `diamond` 是 shape preset，不占 provider key */
export type BuiltinShapeProviderName =
  | typeof BuiltinShape.Rectangle
  | typeof BuiltinShape.Ellipse
  | typeof BuiltinShape.Polygon;

/** 内置 shape provider 注册项；circle / diamond 是 IR 内置 shape preset，不占独立 provider key */
export const BUILTIN_SHAPES = defineBuiltinProviderArray<ShapeDefinition, BuiltinShapeProviderName>([
  rectangle,
  ellipseShape,
  polygon,
]);
