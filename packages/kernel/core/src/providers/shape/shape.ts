import type { ShapeDefinition } from '../../contract';
import { createProviderRegistry } from '../registry';
import { ellipseShape } from './ellipse';
import { polygon } from './polygon';
import { rectangle } from './rectangle';

/** 内置 shape provider 注册项；circle / diamond 是 IR 内置 shape preset，不占独立 provider key */
export const BUILTIN_SHAPES: ReadonlyMap<string, ShapeDefinition> = new Map([
  [rectangle.name, rectangle],
  [ellipseShape.name, ellipseShape],
  [polygon.name, polygon],
]);

/** 解析 shape provider 注册表：内置项先注册，自定义项后注册并复用统一冲突诊断 */
export const resolveShapeRegistry = (shapes?: ReadonlyArray<ShapeDefinition>): ReadonlyMap<string, ShapeDefinition> =>
  createProviderRegistry({
    capability: 'shape',
    builtins: BUILTIN_SHAPES,
    custom: shapes,
    keyOf: definition => definition.name,
  });
