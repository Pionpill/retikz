import type { IRPlotDefaults, IRPlotThemeResolution } from '../../schemas';

import { applyPlotDefaults, mergePlotDefaults } from './mapping';

const doesPlotAxisRuleMatchDimension = (dimension: string | ReadonlyArray<string>, candidate: string): boolean =>
  typeof dimension === 'string' ? dimension === candidate : dimension.includes(candidate);

/** 为一个已有 Axis dimension 按实际来源顺序重放 defaults 和匹配规则 */
export const resolvePlotAxisDefaults = (resolution: IRPlotThemeResolution, dimension: string): IRPlotDefaults => {
  let defaults: IRPlotDefaults = {};
  for (const layer of resolution.layers) {
    defaults = applyPlotDefaults(defaults, layer.defaults);
    for (const source of resolution.rules) {
      if (source.sourcePath !== layer.path) continue;
      if (!doesPlotAxisRuleMatchDimension(source.rule.select.dimension, dimension)) continue;
      defaults = mergePlotDefaults(defaults, { axis: source.rule.axis });
    }
  }
  return defaults;
};
