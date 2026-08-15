import type { IRPlotSpec } from '@retikz/plot';

import { PLOT_NAMESPACE, PlotComposite } from '@retikz/plot';

import type {
  NormalizationState,
  PlotAuthoringContext,
  PlotAuthoringRuntime,
  PlotDeclarationCollection,
  PlotMemberFragment,
} from './contracts';
import type { InputPlot } from './input';

import { normalizePlotBindings } from './bindings';
import { assertChartExtensionCollection, normalizeChartExtension } from './chart-extension';
import { applyDeclaration } from './member-normalizer';
import { normalizePlotRoot } from './plot-root';
import { styleSugarContext } from './style-sugar';

/** normalization 内部累加器的本地简写 */
type Collected = NormalizationState;

/** 将 Plot Vanilla 输入归一为唯一的 Plot Source IR */
export const normalizePlot = (input: InputPlot): IRPlotSpec => {
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
  return {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    ...base,
    scales: normalized.scales,
    ...(normalized.composition === undefined ? {} : { composition: normalized.composition }),
    ...(normalized.coordinate === undefined ? {} : { coordinate: normalized.coordinate }),
    marks: normalized.marks,
    guides: normalized.guides,
  };
};

/** 把 JSON-safe Plot declarations 归一化为 Plot member fragment 与 runtime sidecar */
export const normalizePlotDeclarations = (
  collection: PlotDeclarationCollection,
  context: PlotAuthoringContext,
): { fragment: PlotMemberFragment; runtime: PlotAuthoringRuntime } => {
  const collected: Collected = {
    marks: [],
    guides: [],
    facets: [],
    scaffolds: [],
    transforms: [],
    shortcutTransforms: [],
    scales: [],
    resolveLabels: {},
    colored: false,
    colorFields: [],
    hasBar: false,
    hasRect: false,
    hasHorizontalBar: false,
    hasSector: false,
    hasClosedLine: false,
  };
  if (context.mode === 'chart-extension') assertChartExtensionCollection(collection, context);
  const styleContext = styleSugarContext(context);
  for (const declaration of collection.declarations) {
    if (declaration.kind === 'unsupported') continue;
    applyDeclaration(declaration, collected, styleContext);
  }
  for (const source of collection.runtimeSources) {
    if (source.markId === undefined) {
      throw new Error('buildPlotSpec: resolveLabel needs a mark id to be injected at runtime; set the mark id prop');
    }
    collected.resolveLabels[source.markId] = source.resolveLabel;
  }
  if (context.mode === 'chart-extension') {
    return normalizeChartExtension(collection, context, collected);
  }
  return normalizePlotRoot(context, collected);
};
