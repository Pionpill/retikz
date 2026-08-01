import type {
  NormalizationState,
  PlotAuthoringContext,
  PlotAuthoringRuntime,
  PlotDeclarationCollection,
  PlotMemberFragment,
} from './contracts';

import { assertChartExtensionCollection, normalizeChartExtension } from './chart-extension';
import { plotTextLabelFromDeclaration } from './labels';
import { applyDeclaration } from './member-normalizer';
import { normalizePlotRoot } from './plot-root';
import { styleSugarContext } from './style-sugar';

/** normalization 内部累加器的本地简写 */
type Collected = NormalizationState;

/** 把 JSON-safe React declarations 归一化为 Plot member fragment 与 runtime sidecar */
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
    labels: [],
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
    if (declaration.kind === 'title-label' || declaration.kind === 'caption-label') {
      const isTitle = declaration.kind === 'title-label';
      collected.labels.push(
        plotTextLabelFromDeclaration(
          declaration,
          isTitle ? 'title' : 'caption',
          isTitle ? 'TitleLabel' : 'CaptionLabel',
        ),
      );
      continue;
    }
    applyDeclaration(declaration, collected, styleContext);
  }
  if (context.mode === 'chart-extension') {
    return normalizeChartExtension(collection, context, collected);
  }
  for (const source of collection.runtimeSources) {
    if (source.markId === undefined) {
      throw new Error('buildPlotSpec: resolveLabel needs a mark id to be injected at runtime; set the mark id prop');
    }
    collected.resolveLabels[source.markId] = source.resolveLabel;
  }

  return normalizePlotRoot(context, collected);
};
