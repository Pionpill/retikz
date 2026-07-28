import type { IRPlotSpec } from '../../schemas';
import type { PlotAuthoringInput } from './types';

import { PLOT_NAMESPACE, PlotComposite, PlotSpecSchema } from '../../schemas';
import { normalizePlotBindings } from './normalize-bindings';

/** 从 framework-neutral authoring input 创建 schema-valid PlotSpec */
export const createPlotSpec = (input: PlotAuthoringInput): IRPlotSpec => {
  const { marks, guides = [], facets = [], scaffolds = [], coordinate, composition, ...base } = input;
  const normalized = normalizePlotBindings({
    marks,
    guides,
    scales: base.scales,
    coordinate,
    composition,
    facets,
    scaffolds,
  });
  return PlotSpecSchema.parse({
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    ...base,
    scales: normalized.scales,
    ...(normalized.composition !== undefined ? { composition: normalized.composition } : {}),
    ...(normalized.coordinate !== undefined ? { coordinate: normalized.coordinate } : {}),
    marks: normalized.marks,
    guides: normalized.guides,
  });
};
