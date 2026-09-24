import type { IRChartSource } from '@retikz/chart';
import { renderChart } from '@retikz/chart-vanilla';
import type { CreateBubbleChartInput } from '@retikz/chart-vanilla/point/bubble';
import { createBubbleChart } from '@retikz/chart-vanilla/point/bubble';
import type { CreateConnectedScatterChartInput } from '@retikz/chart-vanilla/point/connected-scatter';
import { createConnectedScatterChart } from '@retikz/chart-vanilla/point/connected-scatter';
import type { CreateRangedDotChartInput } from '@retikz/chart-vanilla/point/ranged-dot';
import { createRangedDotChart } from '@retikz/chart-vanilla/point/ranged-dot';
import type { CreateRegressionChartInput } from '@retikz/chart-vanilla/point/regression';
import { createRegressionChart } from '@retikz/chart-vanilla/point/regression';
import type { CreateScatterChartInput } from '@retikz/chart-vanilla/point/scatter';
import { createScatterChart } from '@retikz/chart-vanilla/point/scatter';
import type { CreateStripChartInput } from '@retikz/chart-vanilla/point/strip';
import { createStripChart } from '@retikz/chart-vanilla/point/strip';
import type { IRBubbleChart } from '@retikz/chart/point/bubble';
import { BubbleChartSchema } from '@retikz/chart/point/bubble';
import type { IRConnectedScatterChart } from '@retikz/chart/point/connected-scatter';
import { ConnectedScatterChartSchema } from '@retikz/chart/point/connected-scatter';
import type { IRRangedDotChart } from '@retikz/chart/point/ranged-dot';
import { RangedDotChartSchema } from '@retikz/chart/point/ranged-dot';
import type { IRRegressionChart } from '@retikz/chart/point/regression';
import { RegressionChartSchema } from '@retikz/chart/point/regression';
import type { IRScatterChart } from '@retikz/chart/point/scatter';
import { ScatterChartSchema } from '@retikz/chart/point/scatter';
import type { IRStripChart } from '@retikz/chart/point/strip';
import { StripChartSchema } from '@retikz/chart/point/strip';
import type { IRChild, TextFont, TextMeasurer } from '@retikz/core';
import { fallbackMeasurer, resolveCoreProviderDependencies } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { InputFlowDiagram } from '@retikz/diagram-vanilla/flow';
import { flowDiagram, FlowDiagramInputEmbedAdapter } from '@retikz/diagram-vanilla/flow';
import type { IRFlowDiagram } from '@retikz/diagram/flow';
import { FlowDiagramSchema } from '@retikz/diagram/flow';
import {
  BlockDefinition,
  BlockHeaderDefinition,
  BlockHeaderSchema,
  BlockRowDefinition,
  BlockRowSchema,
  BlockSchema,
  BlockSectionDefinition,
  BlockSectionSchema,
  createGraphProviders,
  EntityDefinition,
  EntitySchema,
  GraphDefinition,
  GraphProviderKey,
  GraphSchema,
  GroupDefinition,
  GroupSchema,
  RelationDefinition,
  RelationSchema,
} from '@retikz/graph';
import type { InputBlockChild, InputGraphChild, InputGroupChild } from '@retikz/graph-vanilla';
import {
  block,
  blockHeader,
  BlockHeaderInputEmbedAdapter,
  BlockInputEmbedAdapter,
  blockRow,
  BlockRowInputEmbedAdapter,
  blockSection,
  BlockSectionInputEmbedAdapter,
  entity,
  EntityInputEmbedAdapter,
  graph,
  GraphInputEmbedAdapter,
  group,
  GroupInputEmbedAdapter,
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
import type { IRPlot } from '@retikz/plot';
import { PlotSchema } from '@retikz/plot';
import { renderPlot } from '@retikz/plot-vanilla';
import { list, ListInputEmbedAdapter, map, MapInputEmbedAdapter } from '@retikz/standard-vanilla/container';
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
} from '@retikz/standard-vanilla/presentation';
import {
  shape,
  CircleInputEmbedAdapter,
  EllipseInputEmbedAdapter,
  RectangleInputEmbedAdapter,
  RegularPolygonInputEmbedAdapter,
  StarInputEmbedAdapter,
  ArcInputEmbedAdapter,
  SectorInputEmbedAdapter,
} from '@retikz/standard-vanilla/shape';
import type { IRCell, IRList, IRMap } from '@retikz/standard/container';
import { ListDefinition, MapDefinition } from '@retikz/standard/container';
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
} from '@retikz/standard/presentation';
import {
  CircleSchema,
  CircleDefinition,
  EllipseSchema,
  EllipseDefinition,
  RectangleSchema,
  RectangleDefinition,
  RegularPolygonSchema,
  RegularPolygonDefinition,
  StarSchema,
  StarDefinition,
  ArcSchema,
  ArcDefinition,
  SectorSchema,
  SectorDefinition,
} from '@retikz/standard/shape';
import type { IRTable } from '@retikz/table';
import { TableSchema, TableStructureKind } from '@retikz/table';
import { embedTable, TableInputEmbedAdapter } from '@retikz/table-vanilla';
import type { AnyInputEmbedAdapter, InputChild } from '@retikz/vanilla';
import { renderToSvgString, scene, scope } from '@retikz/vanilla';

import { PreviewThemeDefinitionBundle } from '../theme/presets';
import {
  collectPreviewDefinitions,
  entityPreviewAuthoringInput,
  formatVanillaValue,
  graphPreviewAuthoringInput,
  irToVanillaCode,
  relationPreviewAuthoringInput,
} from '../utils';
import type { PreviewIR } from '../utils/build-preview-ir';
import type { BuildVanillaPreviewOptions, VanillaPreviewArtifact } from './types';

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
    code: irToVanillaCode(preview.sourceIr),
    svg: renderToSvgString(input, {
      output: outputSize(preview),
      ...(options.measureText === undefined ? {} : { compile: { measureText: options.measureText } }),
    }),
  };
};

type StandardKind =
  | 'circle'
  | 'ellipse'
  | 'rectangle'
  | 'regularPolygon'
  | 'star'
  | 'arc'
  | 'sector'
  | 'grid'
  | 'axes'
  | 'frame'
  | 'surface'
  | 'legend'
  | 'list'
  | 'map';

type LayoutKind = 'flexLayout' | 'gridLayout' | 'overlayLayout';

type LibraryKind = StandardKind | LayoutKind;

type GraphKind = 'graph' | 'group' | 'block' | 'blockHeader' | 'blockSection' | 'blockRow' | 'entity' | 'relation';

type LibraryConversionState = {
  adapters: Set<LibraryKind>;
};

type GraphConversionState = {
  adapters: Set<GraphKind>;
};

/** 登记转换 Graph Source 所需的 Vanilla adapter */
const registerGraphAdapter = (kind: GraphKind, state: GraphConversionState): void => {
  state.adapters.add(kind);
};

const convertStandardChild = (
  child: CompositeChild,
  state: LibraryConversionState,
  graphState: GraphConversionState,
): InputChild => {
  state.adapters.add(child.type as StandardKind);
  switch (child.type) {
    case 'circle': {
      const { namespace: _namespace, type: _type, ...input } = CircleSchema.parse(child);
      void _namespace;
      void _type;
      return shape.circle(input);
    }
    case 'ellipse': {
      const { namespace: _namespace, type: _type, ...input } = EllipseSchema.parse(child);
      void _namespace;
      void _type;
      return shape.ellipse(input);
    }
    case 'rectangle': {
      const { namespace: _namespace, type: _type, ...input } = RectangleSchema.parse(child);
      void _namespace;
      void _type;
      return shape.rectangle(input);
    }
    case 'regularPolygon': {
      const { namespace: _namespace, type: _type, ...input } = RegularPolygonSchema.parse(child);
      void _namespace;
      void _type;
      return shape.regularPolygon(input);
    }
    case 'star': {
      const { namespace: _namespace, type: _type, ...input } = StarSchema.parse(child);
      void _namespace;
      void _type;
      return shape.star(input);
    }
    case 'arc': {
      const { namespace: _namespace, type: _type, ...input } = ArcSchema.parse(child);
      void _namespace;
      void _type;
      return shape.arc(input);
    }
    case 'sector': {
      const { namespace: _namespace, type: _type, ...input } = SectorSchema.parse(child);
      void _namespace;
      void _type;
      return shape.sector(input);
    }
    case 'grid': {
      const { namespace: _namespace, type: _type, ...input } = GridSchema.parse(child);
      void _namespace;
      void _type;
      return grid(input);
    }
    case 'axes': {
      const { namespace: _namespace, type: _type, ...input } = AxesSchema.parse(child);
      void _namespace;
      void _type;
      return axes(input);
    }
    case 'frame': {
      const { namespace: _namespace, type: _type, ...input } = FrameSchema.parse(child);
      void _namespace;
      void _type;
      return frame(input);
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
      return legend({
        ...input,
        ...(title === undefined ? {} : { title: convertPreviewChild(title, state, graphState) }),
        content: normalizedContent,
      });
    }
    case 'list': {
      const { namespace: _namespace, type: _type, data, items, ...input } = child as IRList;
      void _namespace;
      void _type;
      if (data !== undefined) return list({ ...input, data });
      return list({
        ...input,
        items: items.map(cell =>
          typeof cell === 'string'
            ? cell
            : {
                ...cell,
                content:
                  typeof cell.content === 'string'
                    ? cell.content
                    : convertPreviewChild(cell.content, state, graphState),
              },
        ),
      });
    }
    case 'map': {
      const { namespace: _namespace, type: _type, data, entries, ...input } = child as IRMap;
      void _namespace;
      void _type;
      const convertCell = (cell: string | IRCell) =>
        typeof cell === 'string'
          ? cell
          : {
              ...cell,
              content:
                typeof cell.content === 'string' ? cell.content : convertPreviewChild(cell.content, state, graphState),
            };
      if (data !== undefined) return map({ ...input, data });
      return map({
        ...input,
        entries: entries.map(entry => ({ key: convertCell(entry.key), value: convertCell(entry.value) })),
      });
    }
    case 'surface': {
      const { namespace: _namespace, type: _type, child: nested, ...input } = SurfaceSchema.parse(child);
      void _namespace;
      void _type;
      return surface({
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
  state.adapters.add(child.type as LayoutKind);
  switch (child.type) {
    case 'flexLayout': {
      const { namespace: _namespace, type: _type, children, ...input } = FlexLayoutSchema.parse(child);
      void _namespace;
      void _type;
      return flexLayout({
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
      return gridLayout({
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
      return overlayLayout({
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
      registerGraphAdapter('graph', state);
      return graph({
        ...input,
        entityKinds: PreviewThemeDefinitionBundle.graphEntityKinds,
        ...(children === undefined ? {} : { children }),
        graphThemeStyles: PreviewThemeDefinitionBundle.graph,
      });
    }
    case 'group': {
      const { namespace: _namespace, type: _type, children: sourceChildren, ...input } = GroupSchema.parse(child);
      void _namespace;
      void _type;
      const children: ReadonlyArray<InputGroupChild> | undefined = sourceChildren?.map(nested =>
        convertPreviewChild(nested, libraryState, state),
      );
      registerGraphAdapter('group', state);
      return group({
        ...input,
        ...(children === undefined ? {} : { children }),
      });
    }
    case 'block': {
      const { namespace: _namespace, type: _type, children: sourceChildren, ...input } = BlockSchema.parse(child);
      void _namespace;
      void _type;
      const children: ReadonlyArray<InputBlockChild> | undefined = sourceChildren?.map(nested =>
        convertPreviewChild(nested, libraryState, state),
      );
      registerGraphAdapter('block', state);
      return block({
        ...input,
        ...(children === undefined ? {} : { children }),
      });
    }
    case 'blockHeader': {
      const { namespace: _namespace, type: _type, icon, trail, ...input } = BlockHeaderSchema.parse(child);
      void _namespace;
      void _type;
      registerGraphAdapter('blockHeader', state);
      return blockHeader({
        ...input,
        ...(icon === undefined ? {} : { icon: convertPreviewChild(icon, libraryState, state) }),
        ...(trail === undefined ? {} : { trail: convertPreviewChild(trail, libraryState, state) }),
      });
    }
    case 'blockSection': {
      const {
        namespace: _namespace,
        type: _type,
        children: sourceChildren,
        ...input
      } = BlockSectionSchema.parse(child);
      void _namespace;
      void _type;
      const children: ReadonlyArray<InputGraphChild> | undefined = sourceChildren?.map(nested =>
        convertPreviewChild(nested, libraryState, state),
      );
      registerGraphAdapter('blockSection', state);
      return blockSection({
        ...input,
        ...(children === undefined ? {} : { children }),
      });
    }
    case 'blockRow': {
      const row = BlockRowSchema.parse(child);
      if ('content' in row) {
        const { namespace: _namespace, type: _type, ...input } = row;
        void _namespace;
        void _type;
        registerGraphAdapter('blockRow', state);
        return blockRow({
          ...input,
        });
      }
      const { namespace: _namespace, type: _type, children: sourceChildren, ...input } = row;
      void _namespace;
      void _type;
      registerGraphAdapter('blockRow', state);
      return blockRow({
        ...input,
        ...(sourceChildren === undefined
          ? {}
          : {
              children: sourceChildren.map(item => convertPreviewChild(item, libraryState, state)),
            }),
      });
    }
    case 'entity':
      registerGraphAdapter('entity', state);
      return entity(entityPreviewAuthoringInput(EntitySchema.parse(child)));
    case 'relation':
      registerGraphAdapter('relation', state);
      return relation(relationPreviewAuthoringInput(RelationSchema.parse(child)));
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
  ...(state.adapters.has('circle') ? [CircleInputEmbedAdapter] : []),
  ...(state.adapters.has('ellipse') ? [EllipseInputEmbedAdapter] : []),
  ...(state.adapters.has('rectangle') ? [RectangleInputEmbedAdapter] : []),
  ...(state.adapters.has('regularPolygon') ? [RegularPolygonInputEmbedAdapter] : []),
  ...(state.adapters.has('star') ? [StarInputEmbedAdapter] : []),
  ...(state.adapters.has('arc') ? [ArcInputEmbedAdapter] : []),
  ...(state.adapters.has('sector') ? [SectorInputEmbedAdapter] : []),

  ...(state.adapters.has('grid') ? [GridInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('axes') ? [AxesInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('frame') ? [FrameInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('list') ? [ListInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('map') ? [MapInputEmbedAdapter as AnyInputEmbedAdapter] : []),
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
  ...(state.adapters.has('group') ? [GroupInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('block') ? [BlockInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('blockHeader') ? [BlockHeaderInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('blockSection') ? [BlockSectionInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('blockRow') ? [BlockRowInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('entity') ? [EntityInputEmbedAdapter as AnyInputEmbedAdapter] : []),
  ...(state.adapters.has('relation') ? [RelationInputEmbedAdapter as AnyInputEmbedAdapter] : []),
];

const standardDefinitionByName = {
  CircleDefinition,
  EllipseDefinition,
  RectangleDefinition,
  RegularPolygonDefinition,
  StarDefinition,
  ArcDefinition,
  SectorDefinition,

  GridDefinition,
  AxesDefinition,
  FrameDefinition,
  ListDefinition,
  MapDefinition,
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
  GroupDefinition,
  BlockDefinition,
  BlockHeaderDefinition,
  BlockSectionDefinition,
  BlockRowDefinition,
  EntityDefinition,
  RelationDefinition,
} as const;

const buildLibraryPreview = (preview: PreviewIR, options: BuildVanillaPreviewOptions): VanillaPreviewArtifact => {
  const libraryState: LibraryConversionState = {
    adapters: new Set(),
  };
  const graphState: GraphConversionState = {
    adapters: new Set(),
  };
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
        [
          'grid',
          'axes',
          'frame',
          'surface',
          'legend',
          'list',
          'map',
          'circle',
          'ellipse',
          'rectangle',
          'regularPolygon',
          'star',
          'arc',
          'sector',
        ].includes(kind),
      ),
    ),
    new Set(
      Array.from(libraryState.adapters).filter((kind): kind is LayoutKind =>
        ['flexLayout', 'gridLayout', 'overlayLayout'].includes(kind),
      ),
    ),
    new Set(graphState.adapters),
  );
  const hasStandaloneGraphMembers = graphState.adapters.size > 0 && !graphState.adapters.has('graph');
  const definitions = [
    ...definitionNames.standard.map(name => standardDefinitionByName[name]),
    ...definitionNames.layout.map(name => layoutDefinitionByName[name]),
    ...(!hasStandaloneGraphMembers ? definitionNames.graph.map(name => graphDefinitionByName[name]) : []),
  ];
  const resolvedDefinitions = hasStandaloneGraphMembers
    ? resolveCoreProviderDependencies({
        contributions: [
          {
            roots: [GraphProviderKey],
            providers: createGraphProviders({
              entityKinds: PreviewThemeDefinitionBundle.graphEntityKinds,
              graphThemeStyles: PreviewThemeDefinitionBundle.graph,
            }),
          },
        ],
        definitions: { composites: definitions },
      })
    : { composites: definitions };
  const compile = {
    ...resolvedDefinitions,
    themeStyles: PreviewThemeDefinitionBundle.core,
    measureText: options.measureText ?? browserPreviewMeasurer,
  };
  const renderInput = hasStandaloneGraphMembers
    ? { ...preview.ir, ...(options.theme === undefined ? {} : { theme: options.theme }) }
    : input;
  return {
    code: irToVanillaCode(preview.sourceIr, { theme: options.theme }),
    svg: renderToSvgString(renderInput, {
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

type TypedChartSource =
  | IRScatterChart
  | IRBubbleChart
  | IRConnectedScatterChart
  | IRRangedDotChart
  | IRRegressionChart
  | IRStripChart;

/** 从 Source IR 识别确定形态的 Chart */
const typedChartSourceOf = (source: CompositeChild): TypedChartSource | undefined => {
  if (source.namespace !== 'chart' || source.type !== 'point' || !('recipe' in source)) return undefined;
  const chartType = (source as IRChartSource).recipe.chartType;
  switch (chartType) {
    case 'scatter':
      return ScatterChartSchema.parse(source);
    case 'bubble':
      return BubbleChartSchema.parse(source);
    case 'connected-scatter':
      return ConnectedScatterChartSchema.parse(source);
    case 'ranged-dot':
      return RangedDotChartSchema.parse(source);
    case 'regression':
      return RegressionChartSchema.parse(source);
    case 'strip':
      return StripChartSchema.parse(source);
    default:
      return undefined;
  }
};

/** 将 typed Chart Source IR 还原为公开的精确 Vanilla 输入 */
const typedChartAuthoringInput = (chart: TypedChartSource, datasets: ExternalDatasets): Record<string, unknown> => {
  const { data, recipe, presentation, ...root } = chart;
  const rows = datasets[data.reference];
  const shared = {
    ...root,
    data: rows,
    dataRef: data.reference,
    ...(data.model === undefined ? {} : { dataModel: data.model }),
    ...(presentation?.title === undefined ? {} : { title: presentation.title }),
    ...(presentation?.subtitle === undefined ? {} : { subtitle: presentation.subtitle }),
    ...(presentation?.note === undefined ? {} : { note: presentation.note }),
    ...(presentation?.source === undefined ? {} : { source: presentation.source }),
    encodings: recipe.encodings,
    ...(recipe.properties === undefined ? {} : { properties: recipe.properties }),
    ...(recipe.marks === undefined ? {} : { marks: recipe.marks }),
  };
  return shared;
};

const buildChartCode = (
  chart: IRChartSource,
  datasets: ExternalDatasets,
  preview: PreviewIR,
  options: BuildVanillaPreviewOptions,
): string => {
  const typedSource = typedChartSourceOf(chart);
  if (typedSource !== undefined) {
    const factoryByChartType = {
      bubble: { factory: 'createBubbleChart', subpath: 'bubble' },
      'connected-scatter': { factory: 'createConnectedScatterChart', subpath: 'connected-scatter' },
      'ranged-dot': { factory: 'createRangedDotChart', subpath: 'ranged-dot' },
      regression: { factory: 'createRegressionChart', subpath: 'regression' },
      scatter: { factory: 'createScatterChart', subpath: 'scatter' },
      strip: { factory: 'createStripChart', subpath: 'strip' },
    } as const;
    const { factory, subpath } = factoryByChartType[typedSource.recipe.chartType];
    const datasetImport = buildDatasetImportCode(datasets, options);
    const importCode = datasetImport === null || datasetImport.imports.length === 0 ? '' : `${datasetImport.imports}\n`;
    const dataCode = datasetImport === null ? `const datasets = ${formatVanillaValue(datasets)};\n\n` : '';
    const dataReference = typedSource.data.reference;
    const datasetImportBinding = options.datasetImports?.[dataReference];
    const importedDataset = datasetImportBinding === undefined ? undefined : datasetImportBinding.name;
    const dataExpression =
      importedDataset ?? `${datasetImport?.expression ?? 'datasets'}[${formatVanillaValue(dataReference)}]`;
    const inputCode = formatVanillaValue({
      ...typedChartAuthoringInput(typedSource, datasets),
      data: '__DATASET__',
      ...(options.theme === undefined ? {} : { theme: options.theme }),
      themeStyles: '__CORE_THEME_STYLES__',
      themeDefinitions: '__CHART_THEME_STYLES__',
      lowerOptions: { plotThemeStyles: '__PLOT_THEME_STYLES__' },
    })
      .replace("'__DATASET__'", dataExpression)
      .replace("'__CORE_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.core')
      .replace("'__CHART_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.chart')
      .replace("'__PLOT_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.plot');
    const size = outputSize(preview);
    const renderOptionsCode = Object.keys(size).length === 0 ? '' : `, ${formatVanillaValue({ output: size })}`;
    return `import { renderChart } from '@retikz/chart-vanilla';\nimport { ${factory} } from '@retikz/chart-vanilla/point/${subpath}';\nimport { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';\n${importCode}\n${dataCode}const chart = ${factory}(${inputCode});\n\nexport const svg = renderChart(chart${renderOptionsCode}).svg;\n`;
  }
  return diagnostic(`Cannot generate Vanilla preview for unknown Chart Source type "${chart.type}".`).code;
};

const buildChartPreview = (
  preview: PreviewIR,
  source: CompositeChild,
  options: BuildVanillaPreviewOptions,
): VanillaPreviewArtifact => {
  const chart = typedChartSourceOf(source);
  if (chart === undefined) return diagnostic(`Cannot generate Vanilla preview for Chart Source "${source.type}".`);
  const datasets = findProviderDataset(preview, 'plot', chart.data.reference, 'Chart');
  if (datasets === null) {
    return diagnostic(`Cannot generate Vanilla preview: Chart dataset "${chart.data.reference}" was not captured.`);
  }
  const size = outputSize(preview);
  const input = {
    ...typedChartAuthoringInput(chart, datasets),
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    themeStyles: PreviewThemeDefinitionBundle.core,
    themeDefinitions: PreviewThemeDefinitionBundle.chart,
    lowerOptions: { plotThemeStyles: PreviewThemeDefinitionBundle.plot },
  };
  const runtime = (() => {
    switch (chart.recipe.chartType) {
      case 'bubble':
        return createBubbleChart(input as CreateBubbleChartInput);
      case 'connected-scatter':
        return createConnectedScatterChart(input as CreateConnectedScatterChartInput);
      case 'ranged-dot':
        return createRangedDotChart(input as CreateRangedDotChartInput);
      case 'regression':
        return createRegressionChart(input as CreateRegressionChartInput);
      case 'scatter':
        return createScatterChart(input as CreateScatterChartInput);
      case 'strip':
        return createStripChart(input as CreateStripChartInput);
    }
  })();
  const rendered = renderChart(runtime, {
    ...(options.measureText === undefined ? {} : { compile: { measureText: options.measureText } }),
    ...(Object.keys(size).length === 0 ? {} : { output: size }),
  });
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
  const childrenCode = `[embedTable(spec${embedOptions})]`;
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
    children: [embedTable(spec, Object.keys(resolvedDatasets).length > 0 ? { data: resolvedDatasets } : {})],
  });
  return {
    code: buildTableCode(spec, resolvedDatasets, preview, options),
    svg: renderToSvgString(input, {
      adapters: [TableInputEmbedAdapter],
      output: outputSize(preview),
      ...(options.measureText === undefined ? {} : { compile: { measureText: options.measureText } }),
    }),
    replacePreviewRender: false,
  };
};

const flowAuthoringInput = (source: IRFlowDiagram): InputFlowDiagram => {
  const { namespace: _namespace, type: _type, ...input } = source;
  void _namespace;
  void _type;
  return input;
};

const buildFlowCode = (source: IRFlowDiagram, preview: PreviewIR, options: BuildVanillaPreviewOptions): string => {
  const authoring = {
    ...flowAuthoringInput(source),
    entityKinds: '__GRAPH_ENTITY_KINDS__',
    diagramThemeStyles: '__DIAGRAM_THEME_STYLES__',
    flowThemeStyles: '__FLOW_THEME_STYLES__',
    graphThemeStyles: '__GRAPH_THEME_STYLES__',
  };
  const authoringCode = formatVanillaValue(authoring)
    .replace("'__GRAPH_ENTITY_KINDS__'", 'PreviewThemeDefinitionBundle.graphEntityKinds')
    .replace("'__DIAGRAM_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.diagram')
    .replace("'__FLOW_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.flow')
    .replace("'__GRAPH_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.graph');
  const figureCode = formatVanillaValue({
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    ...(preview.ir.viewBox === undefined ? {} : { viewBox: preview.ir.viewBox }),
    children: '__FLOW_CHILDREN__',
  }).replace("'__FLOW_CHILDREN__'", `[flowDiagram(${authoringCode})]`);
  return `import { flowDiagram, FlowDiagramInputEmbedAdapter } from '@retikz/diagram-vanilla/flow';\nimport { renderToSvgString, scene } from '@retikz/vanilla';\nimport { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';\n\nconst input = scene(${figureCode});\n\nexport const svg = renderToSvgString(input, {\n  adapters: [FlowDiagramInputEmbedAdapter],\n  output: ${formatVanillaValue(outputSize(preview))},\n  compile: { themeStyles: PreviewThemeDefinitionBundle.core },\n});\n`;
};

const buildFlowPreview = (
  preview: PreviewIR,
  composite: CompositeChild,
  options: BuildVanillaPreviewOptions,
): VanillaPreviewArtifact => {
  const source = FlowDiagramSchema.parse(composite);
  const input = scene({
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    ...(preview.ir.viewBox === undefined ? {} : { viewBox: preview.ir.viewBox }),
    children: [
      flowDiagram({
        ...flowAuthoringInput(source),
        entityKinds: PreviewThemeDefinitionBundle.graphEntityKinds,
        diagramThemeStyles: PreviewThemeDefinitionBundle.diagram,
        flowThemeStyles: PreviewThemeDefinitionBundle.flow,
        graphThemeStyles: PreviewThemeDefinitionBundle.graph,
      }),
    ],
  });
  return {
    code: buildFlowCode(source, preview, options),
    svg: renderToSvgString(input, {
      adapters: [FlowDiagramInputEmbedAdapter],
      output: outputSize(preview),
      compile: {
        themeStyles: PreviewThemeDefinitionBundle.core,
        measureText: options.measureText ?? browserPreviewMeasurer,
      },
    }),
  };
};

/** 从统一的预览 IR 上下文生成 Core、Library、Graph、Flow、Plot、Chart 或 Table 的 Vanilla 源码与真实 SVG */
export const buildVanillaPreview = (
  preview: PreviewIR,
  options: BuildVanillaPreviewOptions = {},
): VanillaPreviewArtifact => {
  const runtimeComposites = collectComposites(preview.ir.children);
  const composites = collectComposites(preview.sourceIr.children);
  const effectiveComposites = composites.length === 0 ? runtimeComposites : composites;
  try {
    if (effectiveComposites.length === 0) return buildCorePreview(preview, options);
    const firstComposite = effectiveComposites[0];
    if (
      effectiveComposites.every(
        child => child.namespace === 'standard' || child.namespace === 'layout' || child.namespace === 'graph',
      )
    ) {
      return buildLibraryPreview(preview, options);
    }
    if (effectiveComposites.length === 1 && firstComposite.namespace === 'plot' && firstComposite.type === 'plot') {
      return buildPlotPreview(preview, firstComposite, options);
    }
    if (
      effectiveComposites.length === 1 &&
      firstComposite.namespace === 'chart' &&
      typedChartSourceOf(firstComposite) !== undefined
    ) {
      return buildChartPreview(preview, firstComposite, options);
    }
    if (effectiveComposites.length === 1 && firstComposite.namespace === 'table' && firstComposite.type === 'table') {
      return buildTablePreview(preview, firstComposite, options);
    }
    if (effectiveComposites.length === 1 && firstComposite.namespace === 'diagram' && firstComposite.type === 'flow') {
      return buildFlowPreview(preview, firstComposite, options);
    }
    const unsupported = effectiveComposites.find(
      child =>
        child.namespace !== 'standard' &&
        child.namespace !== 'layout' &&
        child.namespace !== 'graph' &&
        !(child.namespace === 'plot' && child.type === 'plot') &&
        !(child.namespace === 'chart' && typedChartSourceOf(child) !== undefined) &&
        !(child.namespace === 'table' && child.type === 'table') &&
        !(child.namespace === 'diagram' && child.type === 'flow'),
    );
    const child = unsupported ?? firstComposite;
    return diagnostic(`Cannot generate Vanilla preview for Tier 2 composite "${child.namespace}.${child.type}".`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return diagnostic(`Failed to generate Vanilla preview: ${message}`);
  }
};
