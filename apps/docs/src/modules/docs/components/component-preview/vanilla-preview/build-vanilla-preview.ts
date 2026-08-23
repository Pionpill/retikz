import type { ChartPresentationAuthoringRecord, IRBaseChart } from '@retikz/chart';
import type { CreateChartInput } from '@retikz/chart-vanilla';
import type { IRChild, TextFont, TextMeasurer } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { InputGraphChild } from '@retikz/graph-vanilla';
import type { IRPlot } from '@retikz/plot';
import type { IRTable } from '@retikz/table';
import type { AnyInputEmbedAdapter, InputChild } from '@retikz/vanilla';

import { BaseChartSchema } from '@retikz/chart';
import { createChart, renderChart } from '@retikz/chart-vanilla';
import { fallbackMeasurer } from '@retikz/core';
import {
  EntityDefinition,
  EntitySchema,
  GraphDefinition,
  GraphSchema,
  RelationDefinition,
  RelationSchema,
} from '@retikz/graph';
import {
  entity,
  EntityInputEmbedAdapter,
  graph,
  GraphInputEmbedAdapter,
  relation,
  RelationInputEmbedAdapter,
} from '@retikz/graph-vanilla';
import {
  FlexLayoutDefinition,
  FlexLayoutSchema,
  GridLayoutDefinition,
  GridLayoutSchema,
  OverlayLayoutDefinition,
  OverlayLayoutSchema,
} from '@retikz/layout';
import {
  flexLayout,
  FlexLayoutInputEmbedAdapter,
  gridLayout,
  GridLayoutInputEmbedAdapter,
  overlayLayout,
  OverlayLayoutInputEmbedAdapter,
} from '@retikz/layout-vanilla';
import { PlotSchema } from '@retikz/plot';
import { renderPlot } from '@retikz/plot-vanilla';
import {
  AxesDefinition,
  AxesSchema,
  FrameDefinition,
  FrameSchema,
  GridDefinition,
  GridSchema,
  LegendDefinition,
  LegendSchema,
  SurfaceDefinition,
  SurfaceSchema,
} from '@retikz/standard';
import {
  axes,
  AxesInputEmbedAdapter,
  frame,
  FrameInputEmbedAdapter,
  grid,
  GridInputEmbedAdapter,
  legend,
  LegendInputEmbedAdapter,
  surface,
  surfaceChild,
  SurfaceInputEmbedAdapter,
} from '@retikz/standard-vanilla';
import { TableSchema, TableStructureKind } from '@retikz/table';
import { embedTable, TableInputEmbedAdapter } from '@retikz/table-vanilla';
import { renderToSvgString, scene, scope } from '@retikz/vanilla';

import type { PreviewIR } from '../utils/build-preview-ir';
import type { BuildVanillaPreviewOptions, VanillaPreviewArtifact } from './types';

import { PreviewThemeDefinitionBundle } from '../theme/presets';
import {
  collectPreviewDefinitions,
  entityPreviewAuthoringInput,
  formatVanillaValue,
  graphPreviewAuthoringInput,
  irToVanillaCode,
  relationPreviewAuthoringInput,
} from '../utils';

type CompositeChild = IRChild & { namespace: string; type: string };

let previewMeasureCanvas: HTMLCanvasElement | null = null;
let previewMeasureContext: CanvasRenderingContext2D | null = null;

/** 让自动 Vanilla SVG 使用与当前文档页面一致的浏览器字体指标 */
const browserPreviewMeasurer: TextMeasurer = (text: string, font: TextFont) => {
  if (typeof document === 'undefined') return fallbackMeasurer(text, font);
  if (previewMeasureCanvas === null) {
    previewMeasureCanvas = document.createElement('canvas');
    previewMeasureContext = previewMeasureCanvas.getContext('2d');
  }
  if (previewMeasureContext === null) return fallbackMeasurer(text, font);
  const inheritedFamily = getComputedStyle(document.body).fontFamily.trim();
  const family = font.family ?? (inheritedFamily.length > 0 ? inheritedFamily : 'sans-serif');
  previewMeasureContext.font = `${font.style ?? 'normal'} ${font.weight ?? 'normal'} ${font.size}px ${family}`;
  const metrics = previewMeasureContext.measureText(text);
  const ascent = Math.max(0, metrics.actualBoundingBoxAscent);
  const descent = Math.max(0, metrics.actualBoundingBoxDescent);
  return {
    width: metrics.width,
    height: ascent + descent || font.size * 1.2,
    ascent,
    descent,
  };
};

const isComposite = (child: IRChild): child is CompositeChild => 'namespace' in child;

const collectComposites = (children: ReadonlyArray<IRChild>): Array<CompositeChild> => {
  const composites: Array<CompositeChild> = [];
  const visit = (child: IRChild): void => {
    if (isComposite(child)) {
      composites.push(child);
      return;
    }
    if (child.type === 'scope') child.children.forEach(visit);
  };
  children.forEach(visit);
  return composites;
};

const outputSize = (preview: PreviewIR): { width?: number; height?: number } => ({
  ...(typeof preview.width === 'number' ? { width: preview.width } : {}),
  ...(typeof preview.height === 'number' ? { height: preview.height } : {}),
});

const diagnostic = (message: string): VanillaPreviewArtifact => ({ code: `// ${message}` });

/** 把纯 Core IR 子项转换为不含运行时编写信息的 Vanilla 配置 */
const convertCoreChild = (child: IRChild): InputChild => {
  if ('namespace' in child) throw new Error(`Unexpected Tier 2 composite "${child.namespace}.${child.type}".`);
  if (child.type !== 'scope') return child;
  return {
    ...child,
    children: child.children.map(convertCoreChild),
  };
};

const buildCorePreview = (preview: PreviewIR, options: BuildVanillaPreviewOptions): VanillaPreviewArtifact => {
  const input = scene({
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    ...(preview.ir.viewBox !== undefined ? { viewBox: preview.ir.viewBox } : {}),
    ...(preview.ir.animations !== undefined ? { animations: preview.ir.animations } : {}),
    children: preview.ir.children.map(convertCoreChild),
  });
  return {
    code: irToVanillaCode(preview.ir),
    svg: renderToSvgString(input, { output: outputSize(preview) }),
  };
};

type StandardKind = 'grid' | 'axes' | 'frame' | 'surface' | 'legend';

type LayoutKind = 'flexLayout' | 'gridLayout' | 'overlayLayout';

type LibraryKind = StandardKind | LayoutKind;

type GraphKind = 'graph' | 'entity' | 'relation';

type LibraryConversionState = {
  counts: Record<LibraryKind, number>;
  adapters: Set<LibraryKind>;
  /** 规范输入中的显式 ID 到 Vanilla 嵌入生成 ID 的映射 */
  ids: Map<string, string>;
};

type GraphConversionState = {
  counts: Record<GraphKind, number>;
  adapters: Set<GraphKind>;
};

const libraryCanonicalId = (kind: LibraryKind, embedId: string): string => {
  switch (kind) {
    case 'frame':
      return `${embedId}/frame`;
    case 'surface':
      return `${embedId}/surface`;
    default:
      return embedId;
  }
};

const nextLibraryId = (kind: LibraryKind, state: LibraryConversionState, authoredId?: string): string => {
  state.counts[kind] += 1;
  state.adapters.add(kind);
  const embedId = `preview-${kind}-${state.counts[kind]}`;
  if (authoredId !== undefined) {
    const generatedId = libraryCanonicalId(kind, embedId);
    state.ids.set(authoredId, generatedId);
    state.ids.set(generatedId, generatedId);
    if (kind === 'frame') {
      state.ids.set(`${authoredId}/${kind}`, generatedId);
    }
  }
  return embedId;
};

const nextGraphId = (kind: GraphKind, state: GraphConversionState): string => {
  state.counts[kind] += 1;
  state.adapters.add(kind);
  return `preview-${kind}-${state.counts[kind]}`;
};

const registerPreviewIds = (children: ReadonlyArray<IRChild>, libraryState: LibraryConversionState): void => {
  const visit = (child: IRChild): void => {
    if (isComposite(child)) {
      const authoredId = (child as { id?: unknown }).id;
      if (child.namespace === 'standard' && typeof authoredId === 'string') {
        const kind = child.type as StandardKind;
        if (['grid', 'axes', 'frame', 'surface', 'legend'].includes(kind)) {
          // 在转换子项目标前预留确定性 ID
          nextLibraryId(kind, libraryState, authoredId);
          libraryState.counts[kind] -= 1;
          libraryState.adapters.delete(kind);
        }
      }
      if (child.namespace === 'layout' && typeof authoredId === 'string') {
        const kind = child.type as LayoutKind;
        if (['flexLayout', 'gridLayout', 'overlayLayout'].includes(kind)) {
          nextLibraryId(kind, libraryState, authoredId);
          libraryState.counts[kind] -= 1;
          libraryState.adapters.delete(kind);
        }
      }
      if (child.namespace === 'graph' && child.type === 'graph') {
        GraphSchema.parse(child).children?.forEach(visit);
      }
      return;
    }
    if (child.type === 'scope') child.children.forEach(visit);
  };
  children.forEach(visit);
};

const convertStandardChild = (
  child: CompositeChild,
  state: LibraryConversionState,
  graphState: GraphConversionState,
): InputChild => {
  const childId = (child as { id?: string }).id;
  switch (child.type) {
    case 'grid': {
      const { namespace: _namespace, type: _type, ...input } = GridSchema.parse(child);
      void _namespace;
      void _type;
      return grid(nextLibraryId('grid', state, childId), input);
    }
    case 'axes': {
      const { namespace: _namespace, type: _type, ...input } = AxesSchema.parse(child);
      void _namespace;
      void _type;
      return axes(nextLibraryId('axes', state, childId), input);
    }
    case 'frame': {
      const { namespace: _namespace, type: _type, id: _id, ...input } = FrameSchema.parse(child);
      void _namespace;
      void _type;
      void _id;
      return frame(nextLibraryId('frame', state, childId), input);
    }
    case 'legend': {
      const { namespace: _namespace, type: _type, title, content, ...input } = LegendSchema.parse(child);
      void _namespace;
      void _type;
      const normalizedContent =
        content.kind === 'items'
          ? {
              ...content,
              items: content.items.map(item => ({
                ...item,
                sample: convertPreviewChild(item.sample, state, graphState),
                ...(item.label === undefined ? {} : { label: convertPreviewChild(item.label, state, graphState) }),
              })),
            }
          : {
              ...content,
              sample: convertPreviewChild(content.sample, state, graphState),
              ticks: content.ticks.map(tick => ({
                ...tick,
                ...(tick.label === undefined ? {} : { label: convertPreviewChild(tick.label, state, graphState) }),
              })),
            };
      return legend(nextLibraryId('legend', state, childId), {
        ...input,
        ...(title === undefined ? {} : { title: convertPreviewChild(title, state, graphState) }),
        content: normalizedContent,
      });
    }
    case 'surface': {
      const { namespace: _namespace, type: _type, id: _id, child: nested, ...input } = SurfaceSchema.parse(child);
      void _namespace;
      void _type;
      void _id;
      return surface(nextLibraryId('surface', state, childId), {
        ...input,
        child: surfaceChild(convertPreviewChild(nested, state, graphState)),
      });
    }
    default:
      throw new Error(`Unsupported Standard composite "${child.namespace}.${child.type}".`);
  }
};

const convertLayoutChild = (
  child: CompositeChild,
  state: LibraryConversionState,
  graphState: GraphConversionState,
): InputChild => {
  const childId = (child as { id?: string }).id;
  switch (child.type) {
    case 'flexLayout': {
      const { namespace: _namespace, type: _type, children, ...input } = FlexLayoutSchema.parse(child);
      void _namespace;
      void _type;
      return flexLayout(nextLibraryId('flexLayout', state, childId), {
        ...input,
        children: children.map(item => ({
          ...item,
          child: convertPreviewChild(item.child, state, graphState),
        })),
      });
    }
    case 'gridLayout': {
      const { namespace: _namespace, type: _type, children, ...input } = GridLayoutSchema.parse(child);
      void _namespace;
      void _type;
      return gridLayout(nextLibraryId('gridLayout', state, childId), {
        ...input,
        children: children.map(item => ({
          ...item,
          child: convertPreviewChild(item.child, state, graphState),
        })),
      });
    }
    case 'overlayLayout': {
      const { namespace: _namespace, type: _type, children, ...input } = OverlayLayoutSchema.parse(child);
      void _namespace;
      void _type;
      return overlayLayout(nextLibraryId('overlayLayout', state, childId), {
        ...input,
        children: children.map(item => ({
          ...item,
          child: convertPreviewChild(item.child, state, graphState),
        })),
      });
    }
    default:
      throw new Error(`Unsupported Layout composite "${child.namespace}.${child.type}".`);
  }
};

const convertGraphChild = (
  child: CompositeChild,
  state: GraphConversionState,
  libraryState: LibraryConversionState,
): InputChild => {
  switch (child.type) {
    case 'graph': {
      const input = graphPreviewAuthoringInput(GraphSchema.parse(child));
      const convertGraphInputChild = (nested: InputGraphChild): InputGraphChild => {
        if (!('namespace' in nested)) {
          if (nested.type !== 'entity' && nested.type !== 'relation') {
            return convertPreviewChild(nested as IRChild, libraryState, state);
          }
          return nested;
        }
        return convertPreviewChild(nested, libraryState, state);
      };
      const children = input.children?.map(convertGraphInputChild);
      return graph(nextGraphId('graph', state), {
        ...input,
        ...(children === undefined ? {} : { children }),
        graphThemeStyles: PreviewThemeDefinitionBundle.graph,
      });
    }
    case 'entity':
      return entity(nextGraphId('entity', state), {
        ...entityPreviewAuthoringInput(EntitySchema.parse(child)),
        graphThemeStyles: PreviewThemeDefinitionBundle.graph,
      });
    case 'relation':
      return relation(nextGraphId('relation', state), {
        ...relationPreviewAuthoringInput(RelationSchema.parse(child)),
        graphThemeStyles: PreviewThemeDefinitionBundle.graph,
      });
    default:
      throw new Error(`Unsupported Graph composite "${child.namespace}.${child.type}".`);
  }
};

const convertPreviewChild = (
  child: IRChild,
  libraryState: LibraryConversionState,
  graphState: GraphConversionState,
): InputChild => {
  if (isComposite(child)) {
    if (child.namespace === 'standard') return convertStandardChild(child, libraryState, graphState);
    if (child.namespace === 'layout') return convertLayoutChild(child, libraryState, graphState);
    if (child.namespace === 'graph') return convertGraphChild(child, graphState, libraryState);
    throw new Error(`Unsupported composite "${child.namespace}.${child.type}".`);
  }
  if (child.type !== 'scope') return child;
  const { children, type: _type, ...config } = child;
  void _type;
  return scope(
    config,
    children.map(nested => convertPreviewChild(nested, libraryState, graphState)),
  );
};

const standardAdapters = (state: LibraryConversionState): ReadonlyArray<AnyInputEmbedAdapter> => [
  ...(state.adapters.has('grid') ? [GridInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('axes') ? [AxesInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('frame') ? [FrameInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('surface') ? [SurfaceInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('legend') ? [LegendInputEmbedAdapter as AnyInputEmbedAdapter] : []),
];

const layoutAdapters = (state: LibraryConversionState): ReadonlyArray<AnyInputEmbedAdapter> => [
  ...(state.adapters.has('flexLayout') ? [FlexLayoutInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('gridLayout') ? [GridLayoutInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('overlayLayout') ? [OverlayLayoutInputEmbedAdapter as AnyInputEmbedAdapter] : []),
];

const graphAdapters = (state: GraphConversionState): ReadonlyArray<AnyInputEmbedAdapter> => [
  ...(state.adapters.has('graph') ? [GraphInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('entity') ? [EntityInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('relation') ? [RelationInputEmbedAdapter as AnyInputEmbedAdapter] : []),
];

const standardDefinitionByName = {
  GridDefinition,
  AxesDefinition,
  FrameDefinition,
  SurfaceDefinition,
  LegendDefinition,
} as const;

const layoutDefinitionByName = {
  FlexLayoutDefinition,
  GridLayoutDefinition,
  OverlayLayoutDefinition,
} as const;

const graphDefinitionByName = {
  GraphDefinition,
  EntityDefinition,
  RelationDefinition,
} as const;

const buildLibraryPreview = (preview: PreviewIR, options: BuildVanillaPreviewOptions): VanillaPreviewArtifact => {
  const ids = new Map<string, string>();
  const libraryState: LibraryConversionState = {
    counts: {
      grid: 0,
      axes: 0,
      frame: 0,
      surface: 0,
      flexLayout: 0,
      gridLayout: 0,
      overlayLayout: 0,
      legend: 0,
    },
    adapters: new Set(),
    ids,
  };
  const graphState: GraphConversionState = {
    counts: {
      graph: 0,
      entity: 0,
      relation: 0,
    },
    adapters: new Set(),
  };
  registerPreviewIds(preview.ir.children, libraryState);
  const input = scene({
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    ...(preview.ir.viewBox !== undefined ? { viewBox: preview.ir.viewBox } : {}),
    ...(preview.ir.animations !== undefined ? { animations: preview.ir.animations } : {}),
    children: preview.ir.children.map(child => convertPreviewChild(child, libraryState, graphState)),
  });
  const definitionNames = collectPreviewDefinitions(
    preview.ir.children,
    new Set(
      Array.from(libraryState.adapters).filter((kind): kind is StandardKind =>
        ['grid', 'axes', 'frame', 'surface', 'legend'].includes(kind),
      ),
    ),
    new Set(
      Array.from(libraryState.adapters).filter((kind): kind is LayoutKind =>
        ['flexLayout', 'gridLayout', 'overlayLayout'].includes(kind),
      ),
    ),
    new Set(graphState.adapters),
  );
  const definitions = [
    ...definitionNames.standard.map(name => standardDefinitionByName[name]),
    ...definitionNames.layout.map(name => layoutDefinitionByName[name]),
    ...definitionNames.graph.map(name => graphDefinitionByName[name]),
  ];
  const compile = {
    ...(definitions.length === 0 ? {} : { composites: definitions }),
    themeStyles: PreviewThemeDefinitionBundle.core,
    measureText: options.measureText ?? browserPreviewMeasurer,
  };
  return {
    code: irToVanillaCode(preview.ir, { theme: options.theme }),
    svg: renderToSvgString(input, {
      adapters: [...standardAdapters(libraryState), ...layoutAdapters(libraryState), ...graphAdapters(graphState)],
      output: outputSize(preview),
      compile,
    }),
  };
};

/** 从已收集的提供器依赖图贡献中读取一个归属方数据集 */
const findProviderDataset = (
  preview: PreviewIR,
  namespace: string,
  reference: string,
  label: string,
): ExternalDatasets | null => {
  let dataset: unknown;
  let found = false;
  for (const contribution of preview.contributions) {
    for (const provider of contribution.providers) {
      if (
        provider.key.capability !== 'composite' ||
        provider.key.namespace !== namespace ||
        !Object.hasOwn(provider.datasets, reference)
      )
        continue;
      const candidate = provider.datasets[reference];
      if (found && dataset !== candidate) {
        throw new Error(`${label} dataset reference "${reference}" resolves to different values.`);
      }
      dataset = candidate;
      found = true;
    }
  }
  return found ? ({ [reference]: dataset } as ExternalDatasets) : null;
};

/** 读取 Plot 提供器的本地数据集 */
const findPlotDataset = (preview: PreviewIR, spec: IRPlot): ExternalDatasets | null =>
  findProviderDataset(preview, 'plot', spec.data.reference, 'Plot');

const buildPlotCode = (spec: IRPlot, datasets: ExternalDatasets, preview: PreviewIR): string => {
  const size = outputSize(preview);
  const options = Object.keys(size).length > 0 ? `, ${formatVanillaValue(size)}` : '';
  return `import { renderPlot } from '@retikz/plot-vanilla';\n\nconst spec = ${formatVanillaValue(spec)};\nconst datasets = ${formatVanillaValue(datasets)};\n\nexport const svg = renderPlot(spec, datasets${options});\n`;
};

const buildPlotPreview = (
  preview: PreviewIR,
  composite: CompositeChild,
  options: BuildVanillaPreviewOptions,
): VanillaPreviewArtifact => {
  const spec = PlotSchema.parse(composite);
  const datasets = findPlotDataset(preview, spec);
  if (datasets === null) {
    return diagnostic(`Cannot generate Vanilla preview: Plot dataset "${spec.data.reference}" was not captured.`);
  }
  const size = outputSize(preview);
  return {
    code: buildPlotCode(spec, datasets, preview),
    svg: renderPlot(spec, datasets, {
      ...size,
      ...(options.theme === undefined ? {} : { theme: options.theme }),
    }),
  };
};

const findTableDatasets = (preview: PreviewIR, spec: IRTable): ExternalDatasets | null => {
  if (spec.data === undefined) return {};
  return findProviderDataset(preview, 'table', spec.data.reference, 'Table');
};

type DatasetImportCode = {
  imports: string;
  expression: string;
};

const identifierPattern = /^[A-Za-z_$][\w$]*$/;

const buildDatasetImportCode = (
  datasets: ExternalDatasets,
  options: BuildVanillaPreviewOptions,
): DatasetImportCode | null => {
  const references = Object.keys(datasets);
  if (references.length === 0) return { imports: '', expression: '{}' };
  const bindings = references.map(reference => options.datasetImports?.[reference]);
  if (bindings.some(binding => binding === undefined)) return null;

  const importsBySource = new Map<string, Array<string>>();
  bindings.forEach(binding => {
    if (binding === undefined) return;
    if (!identifierPattern.test(binding.name)) {
      throw new Error(`Dataset import name "${binding.name}" is not a supported identifier.`);
    }
    const names = importsBySource.get(binding.from) ?? [];
    if (!names.includes(binding.name)) names.push(binding.name);
    importsBySource.set(binding.from, names);
  });
  const imports = Array.from(
    importsBySource,
    ([from, names]) => `import { ${names.join(', ')} } from ${formatVanillaValue(from)};`,
  ).join('\n');
  const expression = `{ ${references
    .map((reference, index) => {
      const key = identifierPattern.test(reference) ? reference : formatVanillaValue(reference);
      return `${key}: ${bindings[index]?.name ?? 'undefined'}`;
    })
    .join(', ')} }`;
  return { imports, expression };
};

/** 从确定形态的子项恢复仅供 Vanilla 辅助函数使用的编写顺序与上下分区 */
const chartPresentationRecords = (chart: IRBaseChart): Array<ChartPresentationAuthoringRecord> | undefined => {
  const children = chart.presentation?.children;
  if (children === undefined) return undefined;
  const plotIndex = children.findIndex(item => item.kind === 'plot');
  return children.flatMap((item, index) => {
    if (item.kind === 'plot') return [];
    const { kind: _kind, key: _key, ...record } = item;
    void _kind;
    void _key;
    return [{ ...record, position: index < plotIndex ? ('top' as const) : ('bottom' as const) }];
  });
};

/** 将确定形态的 Chart 还原为公开的 Chart Vanilla 编写输入 */
const chartAuthoringInput = (chart: IRBaseChart, datasets: ExternalDatasets): CreateChartInput => {
  const presentation = chartPresentationRecords(chart);
  return {
    plot: { spec: chart.plot },
    datasets,
    ...(chart.id === undefined ? {} : { id: chart.id }),
    ...(chart.chartThemeTokens === undefined ? {} : { chartThemeTokens: chart.chartThemeTokens }),
    ...(presentation === undefined ? {} : { presentation }),
  };
};

const buildChartCode = (
  chart: IRBaseChart,
  datasets: ExternalDatasets,
  preview: PreviewIR,
  options: BuildVanillaPreviewOptions,
): string => {
  const datasetImport = buildDatasetImportCode(datasets, options);
  const importCode = datasetImport === null || datasetImport.imports.length === 0 ? '' : `${datasetImport.imports}\n`;
  const dataCode = datasetImport === null ? `const datasets = ${formatVanillaValue(datasets)};\n\n` : '';
  const dataExpression = datasetImport?.expression ?? 'datasets';
  const { datasets: _datasets, ...authoring } = chartAuthoringInput(chart, datasets);
  void _datasets;
  const inputCode = formatVanillaValue({
    ...authoring,
    datasets: '__DATASETS__',
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    themeStyles: '__CORE_THEME_STYLES__',
    chartThemeStyles: '__CHART_THEME_STYLES__',
    lowerOptions: { plotThemeStyles: '__PLOT_THEME_STYLES__' },
  })
    .replace("'__DATASETS__'", dataExpression)
    .replace("'__CORE_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.core')
    .replace("'__CHART_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.chart')
    .replace("'__PLOT_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.plot');
  const size = outputSize(preview);
  const renderOptions = {
    ...(Object.keys(size).length === 0 ? {} : { output: size }),
  };
  const renderOptionsCode = Object.keys(renderOptions).length === 0 ? '' : `, ${formatVanillaValue(renderOptions)}`;
  return `import { createChart, renderChart } from '@retikz/chart-vanilla';\nimport { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';\n${importCode}\n${dataCode}const chart = createChart(${inputCode});\n\nexport const svg = renderChart(chart${renderOptionsCode}).svg;\n`;
};

const buildChartPreview = (
  preview: PreviewIR,
  composite: CompositeChild,
  options: BuildVanillaPreviewOptions,
): VanillaPreviewArtifact => {
  const chart = BaseChartSchema.parse(composite);
  const datasets = findPlotDataset(preview, chart.plot);
  if (datasets === null) {
    return diagnostic(
      `Cannot generate Vanilla preview: Chart dataset "${chart.plot.data.reference}" was not captured.`,
    );
  }
  const size = outputSize(preview);
  const rendered = renderChart(
    createChart({
      ...chartAuthoringInput(chart, datasets),
      ...(options.theme === undefined ? {} : { theme: options.theme }),
      themeStyles: PreviewThemeDefinitionBundle.core,
      chartThemeStyles: PreviewThemeDefinitionBundle.chart,
      lowerOptions: { plotThemeStyles: PreviewThemeDefinitionBundle.plot },
    }),
    {
      ...(Object.keys(size).length === 0 ? {} : { output: size }),
    },
  );
  return {
    code: buildChartCode(chart, datasets, preview, options),
    svg: rendered.svg,
  };
};

const buildTableCode = (
  spec: IRTable,
  datasets: ExternalDatasets,
  preview: PreviewIR,
  options: BuildVanillaPreviewOptions,
): string => {
  const hasDatasets = Object.keys(datasets).length > 0;
  const datasetImport = hasDatasets ? buildDatasetImportCode(datasets, options) : null;
  const importCode = datasetImport === null || datasetImport.imports.length === 0 ? '' : `${datasetImport.imports}\n`;
  const dataCode = hasDatasets && datasetImport === null ? `const datasets = ${formatVanillaValue(datasets)};\n\n` : '';
  const dataExpression = datasetImport?.expression ?? 'datasets';
  const embedOptions = hasDatasets ? `, { data: ${dataExpression} }` : '';
  const childrenCode = `[embedTable('preview-table-1', spec${embedOptions})]`;
  const figureCode = formatVanillaValue({
    ...(preview.ir.viewBox !== undefined ? { viewBox: preview.ir.viewBox } : {}),
    ...(preview.ir.animations !== undefined ? { animations: preview.ir.animations } : {}),
    children: '__CHILDREN__',
  }).replace("'__CHILDREN__'", childrenCode);
  const size = outputSize(preview);
  const renderOptions = {
    adapters: '__ADAPTERS__',
    ...(Object.keys(size).length > 0 ? { output: size } : {}),
  };
  const optionsCode = formatVanillaValue(renderOptions).replace("'__ADAPTERS__'", '[TableInputEmbedAdapter]');
  return `import { embedTable, TableInputEmbedAdapter } from '@retikz/table-vanilla';\nimport { renderToSvgString, scene } from '@retikz/vanilla';\n${importCode}\nconst spec = ${formatVanillaValue(spec)};\n${dataCode}const input = scene(${figureCode});\n\nexport const svg = renderToSvgString(input, ${optionsCode});\n`;
};

const buildTablePreview = (
  preview: PreviewIR,
  composite: CompositeChild,
  options: BuildVanillaPreviewOptions,
): VanillaPreviewArtifact => {
  const spec = TableSchema.parse(composite);
  if (spec.structure.kind !== TableStructureKind.Detail && spec.structure.kind !== TableStructureKind.Manual) {
    return diagnostic(
      `Cannot generate Vanilla preview: Table structure "${spec.structure.kind}" requires runtime definitions that cannot be serialized.`,
    );
  }
  const datasets = findTableDatasets(preview, spec);
  if (datasets === null && spec.data !== undefined) {
    return diagnostic(`Cannot generate Vanilla preview: Table dataset "${spec.data.reference}" was not captured.`);
  }
  const resolvedDatasets = datasets ?? {};
  const input = scene({
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    ...(preview.ir.viewBox !== undefined ? { viewBox: preview.ir.viewBox } : {}),
    ...(preview.ir.animations !== undefined ? { animations: preview.ir.animations } : {}),
    children: [
      embedTable('preview-table-1', spec, Object.keys(resolvedDatasets).length > 0 ? { data: resolvedDatasets } : {}),
    ],
  });
  return {
    code: buildTableCode(spec, resolvedDatasets, preview, options),
    svg: renderToSvgString(input, { adapters: [TableInputEmbedAdapter], output: outputSize(preview) }),
    replacePreviewRender: false,
  };
};

/** 从统一的预览 IR 上下文生成 Core、Library、Graph、Plot、Chart 或 Table 的 Vanilla 源码与真实 SVG */
export const buildVanillaPreview = (
  preview: PreviewIR,
  options: BuildVanillaPreviewOptions = {},
): VanillaPreviewArtifact => {
  const composites = collectComposites(preview.ir.children);
  try {
    if (composites.length === 0) return buildCorePreview(preview, options);
    const firstComposite = composites[0];
    if (
      composites.every(
        child => child.namespace === 'standard' || child.namespace === 'layout' || child.namespace === 'graph',
      )
    ) {
      return buildLibraryPreview(preview, options);
    }
    if (composites.length === 1 && firstComposite.namespace === 'plot' && firstComposite.type === 'plot') {
      return buildPlotPreview(preview, firstComposite, options);
    }
    if (composites.length === 1 && firstComposite.namespace === 'chart' && firstComposite.type === 'base') {
      return buildChartPreview(preview, firstComposite, options);
    }
    if (composites.length === 1 && firstComposite.namespace === 'table' && firstComposite.type === 'table') {
      return buildTablePreview(preview, firstComposite, options);
    }
    const unsupported = composites.find(
      child =>
        child.namespace !== 'standard' &&
        child.namespace !== 'layout' &&
        child.namespace !== 'graph' &&
        !(child.namespace === 'plot' && child.type === 'plot') &&
        !(child.namespace === 'chart' && child.type === 'base') &&
        !(child.namespace === 'table' && child.type === 'table'),
    );
    const child = unsupported ?? firstComposite;
    return diagnostic(`Cannot generate Vanilla preview for Tier 2 composite "${child.namespace}.${child.type}".`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return diagnostic(`Failed to generate Vanilla preview: ${message}`);
  }
};
