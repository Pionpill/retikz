import type { ShapeDefinition } from '../../contract';
import { ellipseShape } from './ellipse';
import { polygon } from './polygon';
import { rectangle } from './rectangle';

/** 内置 shape provider 注册项；circle / diamond 是 IR 内置 shape preset，不占独立 provider key */
export const BUILTIN_SHAPES: ReadonlyMap<string, ShapeDefinition> = new Map([
  [rectangle.name, rectangle],
  [ellipseShape.name, ellipseShape],
  [polygon.name, polygon],
]);
