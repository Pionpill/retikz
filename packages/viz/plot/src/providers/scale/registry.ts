import type { AnyScaleDefinition } from '../../contract';

import { extractScaleType, PositionScaleContinuity } from '../../contract';
import { RetikzPlotError } from '../../error';
import { COLOR_SCALE_DEFINITIONS, POSITION_SCALE_DEFINITIONS } from './features';

/**
 * 内置 scale definition 列表（position 9 + channel 6 = 15）
 * @description 按 family 分族登记；内置与自定义 scale 由同一个 registry resolver 合并
 */
export const BUILTIN_SCALES: ReadonlyArray<AnyScaleDefinition> = [
  ...POSITION_SCALE_DEFINITIONS,
  ...COLOR_SCALE_DEFINITIONS,
];

/**
 * 合并 scale registry
 * @description 内置 scale 先注册，用户 definition 后注册；重复 key fail-loud。具体 definition lookup 和领域诊断由 resolve/scale 负责
 */
export const resolveScaleRegistry = (custom?: ReadonlyArray<AnyScaleDefinition>): Map<string, AnyScaleDefinition> => {
  const registry = new Map<string, AnyScaleDefinition>();
  for (const def of BUILTIN_SCALES) {
    registry.set(extractScaleType(def.schema), def);
  }
  for (const def of custom ?? []) {
    const continuity = Reflect.get(def, 'continuity');
    if (
      def.family === 'position' &&
      continuity !== PositionScaleContinuity.Continuous &&
      continuity !== PositionScaleContinuity.Discrete
    ) {
      throw new RetikzPlotError('lowerPlots: position scale definition continuity must be "continuous" or "discrete"');
    }
    const type = extractScaleType(def.schema);
    if (registry.has(type)) {
      throw new RetikzPlotError(`lowerPlots: duplicate scale registration: "${type}"`);
    }
    registry.set(type, def);
  }
  return registry;
};
