import type { IRChartSource } from '@retikz/chart';
import { renderChart } from '@retikz/chart-vanilla';
import {
  scatterChartInputEmbedAdapter,
  bubbleChartInputEmbedAdapter,
  connectedScatterChartInputEmbedAdapter,
  rangedDotChartInputEmbedAdapter,
  regressionChartInputEmbedAdapter,
  stripChartInputEmbedAdapter,
} from '@retikz/chart-vanilla/point';
import type {
  BubbleChartInputEmbedProps,
  ConnectedScatterChartInputEmbedProps,
  RangedDotChartInputEmbedProps,
  RegressionChartInputEmbedProps,
  ScatterChartInputEmbedProps,
  StripChartInputEmbedProps,
} from '@retikz/chart-vanilla/point';
import {
  bubbleChart,
  connectedScatterChart,
  rangedDotChart,
  regressionChart,
  scatterChart,
  stripChart,
} from '@retikz/chart-vanilla/point';
import type {
  IRBubbleChart,
  IRConnectedScatterChart,
  IRRangedDotChart,
  IRRegressionChart,
  IRScatterChart,
  IRStripChart,
} from '@retikz/chart/point';
import {
  BubbleChartSchema,
  ConnectedScatterChartSchema,
  RangedDotChartSchema,
  RegressionChartSchema,
  ScatterChartSchema,
  StripChartSchema,
} from '@retikz/chart/point';
import type { IRChild, TextFont, TextMeasurer } from '@retikz/core';
import { fallbackMeasurer, resolveCoreProviderDependencies } from '@retikz/core';
import type { ExternalDatasets, ExternalRow } from '@retikz/data';
import type { InputBranchDiagram } from '@retikz/diagram-vanilla/branch';
import { branchDiagram, branchDiagramInputEmbedAdapter } from '@retikz/diagram-vanilla/branch';
import type { InputFlowDiagram } from '@retikz/diagram-vanilla/flow';
import { flowDiagram, flowDiagramInputEmbedAdapter } from '@retikz/diagram-vanilla/flow';
import type { IRBranchDiagram } from '@retikz/diagram/branch';
import { BranchDiagramSchema } from '@retikz/diagram/branch';
import type { IRFlowDiagram } from '@retikz/diagram/flow';
import { FlowDiagramSchema } from '@retikz/diagram/flow';
import {
  blockDefinition,
  blockHeaderDefinition,
  BlockHeaderSchema,
  blockRowDefinition,
  BlockRowSchema,
  BlockSchema,
  blockSectionDefinition,
  BlockSectionSchema,
  createGraphProviders,
  entityDefinition,
  EntitySchema,
  graphDefinition,
  GraphProviderKey,
  GraphSchema,
  groupDefinition,
  GroupSchema,
  relationDefinition,
  RelationSchema,
} from '@retikz/graph';
import type { InputBlockChild, InputGraphChild, InputGroupChild } from '@retikz/graph-vanilla';
import {
  block,
  blockHeader,
  blockHeaderInputEmbedAdapter,
  blockInputEmbedAdapter,
  blockRow,
  blockRowInputEmbedAdapter,
  blockSection,
  blockSectionInputEmbedAdapter,
  entity,
  entityInputEmbedAdapter,
  graph,
  graphInputEmbedAdapter,
  group,
  groupInputEmbedAdapter,
  relation,
  relationInputEmbedAdapter,
} from '@retikz/graph-vanilla';
import {
  flexLayoutDefinition,
  FlexLayoutSchema,
  gridLayoutDefinition,
  GridLayoutSchema,
  overlayLayoutDefinition,
  OverlayLayoutSchema,
} from '@retikz/layout';
import {
  flexLayout,
  flexLayoutInputEmbedAdapter,
  gridLayout,
  gridLayoutInputEmbedAdapter,
  overlayLayout,
  overlayLayoutInputEmbedAdapter,
} from '@retikz/layout-vanilla';
import type { IRPlot, PlotProviderParams } from '@retikz/plot';
import { PlotSchema } from '@retikz/plot';
import { renderPlot } from '@retikz/plot-vanilla';
import {
  tree,
  treeInputEmbedAdapter,
  queue,
  queueInputEmbedAdapter,
  stack,
  stackInputEmbedAdapter,
} from '@retikz/standard-vanilla/collection';
import { chain, chainInputEmbedAdapter } from '@retikz/standard-vanilla/collection';
import type { InputChainItem } from '@retikz/standard-vanilla/collection';
import {
  matrix,
  matrixInputEmbedAdapter,
  array,
  arrayInputEmbedAdapter,
  map,
  mapInputEmbedAdapter,
} from '@retikz/standard-vanilla/collection';
import {
  axes,
  axesInputEmbedAdapter,
  frame,
  frameInputEmbedAdapter,
  grid,
  gridInputEmbedAdapter,
  legend,
  legendInputEmbedAdapter,
  surface,
  surfaceChild,
  surfaceInputEmbedAdapter,
} from '@retikz/standard-vanilla/presentation';
import {
  shape,
  circleInputEmbedAdapter,
  ellipseInputEmbedAdapter,
  rectangleInputEmbedAdapter,
  polygonInputEmbedAdapter,
  starInputEmbedAdapter,
  arcInputEmbedAdapter,
  sectorInputEmbedAdapter,
} from '@retikz/standard-vanilla/shape';
import type { IRTree, IRQueue, IRStack } from '@retikz/standard/collection';
import { treeDefinition, queueDefinition, stackDefinition, chainDefinition } from '@retikz/standard/collection';
import type { IRChain, IRChainItem } from '@retikz/standard/collection';
import type { IRCell, IRMatrix, IRArray, IRMap } from '@retikz/standard/collection';
import { matrixDefinition, arrayDefinition, mapDefinition } from '@retikz/standard/collection';
import {
  axesDefinition,
  AxesSchema,
  frameDefinition,
  FrameSchema,
  gridDefinition,
  GridSchema,
  legendDefinition,
  LegendSchema,
  surfaceDefinition,
  SurfaceSchema,
} from '@retikz/standard/presentation';
import {
  CircleSchema,
  circleDefinition,
  EllipseSchema,
  ellipseDefinition,
  RectangleSchema,
  rectangleDefinition,
  PolygonSchema,
  polygonDefinition,
  StarSchema,
  starDefinition,
  ArcSchema,
  arcDefinition,
  SectorSchema,
  sectorDefinition,
} from '@retikz/standard/shape';
import type { IRTable, TableProviderParams } from '@retikz/table';
import { TableSchema, TableStructureKind } from '@retikz/table';
import { embedTable, tableInputEmbedAdapter } from '@retikz/table-vanilla';
import type { SynchronousInputEmbedAdapter, InputChild } from '@retikz/vanilla';
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
  const svg = renderToSvgString(input, {
    output: outputSize(preview),
    ...(preview.paths === undefined && preview.shapes === undefined && options.measureText === undefined
      ? {}
      : { compile: { paths: preview.paths, shapes: preview.shapes, measureText: options.measureText } }),
  });

  try {
    return { code: irToVanillaCode(preview.sourceIr, { paths: preview.paths, shapes: preview.shapes }), svg };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ...diagnostic(message), svg };
  }
};

type StandardKind =
  | 'circle'
  | 'ellipse'
  | 'rectangle'
  | 'polygon'
  | 'star'
  | 'arc'
  | 'sector'
  | 'grid'
  | 'axes'
  | 'frame'
  | 'surface'
  | 'legend'
  | 'queue'
  | 'tree'
  | 'stack'
  | 'chain'
  | 'matrix'
  | 'array'
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
    case 'polygon': {
      const { namespace: _namespace, type: _type, ...input } = PolygonSchema.parse(child);
      void _namespace;
      void _type;

      return shape.polygon(input);
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
    case 'chain': {
      const { namespace, type, items, data, skeleton, dataExpand, ...input } = child as IRChain;
      void namespace;
      void type;
      if (skeleton !== undefined) return chain({ ...input, skeleton });
      if (data !== undefined) return chain({ ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) });

      const convert = (sequence: Array<IRChainItem>): Array<InputChainItem> =>
        sequence.map(item =>
          typeof item === 'string'
            ? item
            : item.kind === 'parallel'
              ? { ...item, branches: item.branches.map(branch => ({ items: convert(branch.items) })) }
              : item.content === undefined || typeof item.content === 'string'
                ? item
                : { ...item, content: convertPreviewChild(item.content, state, graphState) },
        );

      return chain({ ...input, items: convert(items) });
    }
    case 'matrix': {
      const { namespace: _namespace, type: _type, data, items, skeleton, dataExpand, ...input } = child as IRMatrix;
      void _namespace;
      void _type;
      if (skeleton !== undefined) return matrix({ ...input, skeleton });
      if (data !== undefined) return matrix({ ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) });

      return matrix({
        ...input,
        items: items.map(row =>
          row.map(cell =>
            typeof cell === 'string'
              ? cell
              : {
                  ...cell,
                  content:
                    cell.content === undefined || typeof cell.content === 'string'
                      ? cell.content
                      : convertPreviewChild(cell.content, state, graphState),
                },
          ),
        ),
      });
    }
    case 'tree': {
      const { namespace: _namespace, type: _type, ...input } = child as IRTree;
      void _namespace;
      void _type;
      return tree(input);
    }
    case 'queue': {
      const { namespace: _namespace, type: _type, data, items, skeleton, dataExpand, ...input } = child as IRQueue;
      void _namespace;
      void _type;
      if (skeleton !== undefined) return queue({ ...input, skeleton });
      if (data !== undefined) return queue({ ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) });

      return queue({
        ...input,
        items: items.map(cell =>
          typeof cell === 'string'
            ? cell
            : {
                ...cell,
                content:
                  cell.content === undefined || typeof cell.content === 'string'
                    ? cell.content
                    : convertPreviewChild(cell.content, state, graphState),
              },
        ),
      });
    }
    case 'stack': {
      const { namespace: _namespace, type: _type, data, items, skeleton, dataExpand, ...input } = child as IRStack;
      void _namespace;
      void _type;
      if (skeleton !== undefined) return stack({ ...input, skeleton });
      if (data !== undefined) return stack({ ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) });

      return stack({
        ...input,
        items: items.map(cell =>
          typeof cell === 'string'
            ? cell
            : {
                ...cell,
                content:
                  cell.content === undefined || typeof cell.content === 'string'
                    ? cell.content
                    : convertPreviewChild(cell.content, state, graphState),
              },
        ),
      });
    }
    case 'array': {
      const { namespace: _namespace, type: _type, data, items, skeleton, dataExpand, ...input } = child as IRArray;
      void _namespace;
      void _type;
      if (skeleton !== undefined) return array({ ...input, skeleton });
      if (data !== undefined) return array({ ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) });

      return array({
        ...input,
        items: items.map(cell =>
          typeof cell === 'string'
            ? cell
            : {
                ...cell,
                content:
                  cell.content === undefined || typeof cell.content === 'string'
                    ? cell.content
                    : convertPreviewChild(cell.content, state, graphState),
              },
        ),
      });
    }
    case 'map': {
      const { namespace: _namespace, type: _type, data, entries, skeleton, dataExpand, ...input } = child as IRMap;
      void _namespace;
      void _type;
      const convertCell = (cell: string | IRCell) =>
        typeof cell === 'string'
          ? cell
          : {
              ...cell,
              content:
                cell.content === undefined || typeof cell.content === 'string'
                  ? cell.content
                  : convertPreviewChild(cell.content, state, graphState),
            };
      if (skeleton !== undefined) return map({ ...input, skeleton });
      if (data !== undefined) return map({ ...input, data, ...(dataExpand === undefined ? {} : { dataExpand }) });

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
        relationKinds: PreviewThemeDefinitionBundle.graphRelationKinds,
        ...(children === undefined ? {} : { children }),
        graphThemeDefinitions: PreviewThemeDefinitionBundle.graph,
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

const standardAdapters = (state: LibraryConversionState): ReadonlyArray<SynchronousInputEmbedAdapter<never>> => [
  ...(state.adapters.has('circle') ? [circleInputEmbedAdapter] : []),
  ...(state.adapters.has('ellipse') ? [ellipseInputEmbedAdapter] : []),
  ...(state.adapters.has('rectangle') ? [rectangleInputEmbedAdapter] : []),
  ...(state.adapters.has('polygon') ? [polygonInputEmbedAdapter] : []),
  ...(state.adapters.has('star') ? [starInputEmbedAdapter] : []),
  ...(state.adapters.has('arc') ? [arcInputEmbedAdapter] : []),
  ...(state.adapters.has('sector') ? [sectorInputEmbedAdapter] : []),

  ...(state.adapters.has('grid') ? [gridInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('axes') ? [axesInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('frame') ? [frameInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('tree') ? [treeInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('queue') ? [queueInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('stack') ? [stackInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('chain') ? [chainInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('matrix') ? [matrixInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('array') ? [arrayInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('map') ? [mapInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('surface') ? [surfaceInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('legend') ? [legendInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
];

const layoutAdapters = (state: LibraryConversionState): ReadonlyArray<SynchronousInputEmbedAdapter<never>> => [
  ...(state.adapters.has('flexLayout') ? [flexLayoutInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('gridLayout') ? [gridLayoutInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('overlayLayout')
    ? [overlayLayoutInputEmbedAdapter as SynchronousInputEmbedAdapter<never>]
    : []),
];

const graphAdapters = (state: GraphConversionState): ReadonlyArray<SynchronousInputEmbedAdapter<never>> => [
  ...(state.adapters.has('graph') ? [graphInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('group') ? [groupInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('block') ? [blockInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('blockHeader') ? [blockHeaderInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('blockSection') ? [blockSectionInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('blockRow') ? [blockRowInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('entity') ? [entityInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
  ...(state.adapters.has('relation') ? [relationInputEmbedAdapter as SynchronousInputEmbedAdapter<never>] : []),
];

const standardDefinitionByName = {
  circleDefinition,
  ellipseDefinition,
  rectangleDefinition,
  polygonDefinition,
  starDefinition,
  arcDefinition,
  sectorDefinition,

  gridDefinition,
  axesDefinition,
  frameDefinition,
  treeDefinition,
  queueDefinition,
  stackDefinition,
  chainDefinition,
  matrixDefinition,
  arrayDefinition,
  mapDefinition,
  surfaceDefinition,
  legendDefinition,
} as const;

const layoutDefinitionByName = {
  flexLayoutDefinition,
  gridLayoutDefinition,
  overlayLayoutDefinition,
} as const;

const graphDefinitionByName = {
  graphDefinition,
  groupDefinition,
  blockDefinition,
  blockHeaderDefinition,
  blockSectionDefinition,
  blockRowDefinition,
  entityDefinition,
  relationDefinition,
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
          'queue',
          'tree',
          'stack',
          'chain',
          'matrix',
          'array',
          'map',
          'circle',
          'ellipse',
          'rectangle',
          'polygon',
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
              relationKinds: PreviewThemeDefinitionBundle.graphRelationKinds,
              graphThemeDefinitions: PreviewThemeDefinitionBundle.graph,
            }),
          },
        ],
        definitions: { composites: definitions },
      })
    : { composites: definitions };

  const compile = {
    ...resolvedDefinitions,
    themeDefinitions: PreviewThemeDefinitionBundle.core,
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

/** 从 Plot 或 Table 提供者的具名参数中读取预览数据集 */
const findProviderDataset = (
  preview: PreviewIR,
  namespace: 'plot' | 'table',
  reference: string,
  label: string,
): ExternalDatasets | null => {
  let dataset: Array<ExternalRow> | undefined;

  for (const contribution of preview.contributions) {
    for (const provider of contribution.providers) {
      if (
        provider.key.capability !== 'composite' ||
        provider.key.namespace !== namespace ||
        provider.key.type !== namespace ||
        provider.params === undefined
      )
        continue;

      // 官方完整 key 对应各自公开的参数契约；通用 Core 目录仅保存擦除视图
      const { datasets } = provider.params as PlotProviderParams | TableProviderParams;
      if (!Object.hasOwn(datasets, reference)) continue;
      const candidate = datasets[reference];
      if (dataset !== undefined && dataset !== candidate) {
        throw new Error(`${label} dataset reference "${reference}" resolves to different values.`);
      }

      dataset = candidate;
    }
  }

  return dataset === undefined ? null : { [reference]: dataset };
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
      bubble: 'bubbleChart',
      'connected-scatter': 'connectedScatterChart',
      'ranged-dot': 'rangedDotChart',
      regression: 'regressionChart',
      scatter: 'scatterChart',
      strip: 'stripChart',
    } as const;
    const factory = factoryByChartType[typedSource.recipe.chartType];
    const adapter = `${factory[0].toUpperCase()}${factory.slice(1)}InputEmbedAdapter`;

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
      themeDefinitions: '__CORE_THEME_STYLES__',
      chartThemeDefinitions: '__CHART_THEME_STYLES__',
      lowerOptions: { definitions: { plotThemeDefinitions: '__PLOT_THEME_STYLES__' } },
    })
      .replace("'__DATASET__'", dataExpression)
      .replace("'__CORE_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.core')
      .replace("'__CHART_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.chart')
      .replace("'__PLOT_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.plot');

    const size = outputSize(preview);
    const renderOptionsCode = `, { adapters: [${adapter}]${Object.keys(size).length === 0 ? '' : `, output: ${formatVanillaValue(size)}`} }`;

    return `import { renderChart } from '@retikz/chart-vanilla';\nimport { ${factory}, ${adapter} } from '@retikz/chart-vanilla/point';\nimport { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';\n${importCode}\n${dataCode}const chart = ${factory}(${inputCode});\n\nexport const svg = renderChart(chart${renderOptionsCode}).svg;\n`;
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
    themeDefinitions: PreviewThemeDefinitionBundle.core,
    chartThemeDefinitions: PreviewThemeDefinitionBundle.chart,
    lowerOptions: { definitions: { plotThemeDefinitions: PreviewThemeDefinitionBundle.plot } },
  };

  const runtime = (() => {
    switch (chart.recipe.chartType) {
      case 'bubble':
        return bubbleChart(input as BubbleChartInputEmbedProps);
      case 'connected-scatter':
        return connectedScatterChart(input as ConnectedScatterChartInputEmbedProps);
      case 'ranged-dot':
        return rangedDotChart(input as RangedDotChartInputEmbedProps);
      case 'regression':
        return regressionChart(input as RegressionChartInputEmbedProps);
      case 'scatter':
        return scatterChart(input as ScatterChartInputEmbedProps);
      case 'strip':
        return stripChart(input as StripChartInputEmbedProps);
    }
  })();

  const rendered = renderChart(runtime, {
    adapters: [
      scatterChartInputEmbedAdapter,
      bubbleChartInputEmbedAdapter,
      connectedScatterChartInputEmbedAdapter,
      rangedDotChartInputEmbedAdapter,
      regressionChartInputEmbedAdapter,
      stripChartInputEmbedAdapter,
    ],
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
  const optionsCode = formatVanillaValue(renderOptions).replace("'__ADAPTERS__'", '[tableInputEmbedAdapter]');

  return `import { embedTable, tableInputEmbedAdapter } from '@retikz/table-vanilla';\nimport { renderToSvgString, scene } from '@retikz/vanilla';\n${importCode}\nconst spec = ${formatVanillaValue(spec)};\n${dataCode}const input = scene(${figureCode});\n\nexport const svg = renderToSvgString(input, ${optionsCode});\n`;
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
      adapters: [tableInputEmbedAdapter],
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
    relationKinds: '__GRAPH_RELATION_KINDS__',
    diagramThemeDefinitions: '__DIAGRAM_THEME_STYLES__',
    flowThemeDefinitions: '__FLOW_THEME_STYLES__',
    graphThemeDefinitions: '__GRAPH_THEME_STYLES__',
  };
  const authoringCode = formatVanillaValue(authoring)
    .replace("'__GRAPH_ENTITY_KINDS__'", 'PreviewThemeDefinitionBundle.graphEntityKinds')
    .replace("'__GRAPH_RELATION_KINDS__'", 'PreviewThemeDefinitionBundle.graphRelationKinds')
    .replace("'__DIAGRAM_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.diagram')
    .replace("'__FLOW_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.flow')
    .replace("'__GRAPH_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.graph');
  const figureCode = formatVanillaValue({
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    ...(preview.ir.viewBox === undefined ? {} : { viewBox: preview.ir.viewBox }),
    children: '__FLOW_CHILDREN__',
  }).replace("'__FLOW_CHILDREN__'", `[flowDiagram(${authoringCode})]`);

  return `import { flowDiagram, flowDiagramInputEmbedAdapter } from '@retikz/diagram-vanilla/flow';\nimport { renderToSvgString, scene } from '@retikz/vanilla';\nimport { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';\n\nconst input = scene(${figureCode});\n\nexport const svg = renderToSvgString(input, {\n  adapters: [flowDiagramInputEmbedAdapter],\n  output: ${formatVanillaValue(outputSize(preview))},\n  compile: { themeDefinitions: PreviewThemeDefinitionBundle.core },\n});\n`;
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
        relationKinds: PreviewThemeDefinitionBundle.graphRelationKinds,
        diagramThemeDefinitions: PreviewThemeDefinitionBundle.diagram,
        flowThemeDefinitions: PreviewThemeDefinitionBundle.flow,
        graphThemeDefinitions: PreviewThemeDefinitionBundle.graph,
      }),
    ],
  });

  return {
    code: buildFlowCode(source, preview, options),
    svg: renderToSvgString(input, {
      adapters: [flowDiagramInputEmbedAdapter],
      output: outputSize(preview),
      compile: {
        themeDefinitions: PreviewThemeDefinitionBundle.core,
        measureText: options.measureText ?? browserPreviewMeasurer,
      },
    }),
  };
};

const branchAuthoringInput = (source: IRBranchDiagram): InputBranchDiagram => {
  const { namespace: _namespace, type: _type, ...input } = source;
  void _namespace;
  void _type;

  return input;
};

const buildBranchCode = (source: IRBranchDiagram, preview: PreviewIR, options: BuildVanillaPreviewOptions): string => {
  const authoring = {
    ...branchAuthoringInput(source),
    entityKinds: '__GRAPH_ENTITY_KINDS__',
    relationKinds: '__GRAPH_RELATION_KINDS__',
    diagramThemeDefinitions: '__DIAGRAM_THEME_STYLES__',
    graphThemeDefinitions: '__GRAPH_THEME_STYLES__',
  };
  const authoringCode = formatVanillaValue(authoring)
    .replace("'__GRAPH_ENTITY_KINDS__'", 'PreviewThemeDefinitionBundle.graphEntityKinds')
    .replace("'__GRAPH_RELATION_KINDS__'", 'PreviewThemeDefinitionBundle.graphRelationKinds')
    .replace("'__DIAGRAM_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.diagram')
    .replace("'__GRAPH_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.graph');
  const figureCode = formatVanillaValue({
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    ...(preview.ir.viewBox === undefined ? {} : { viewBox: preview.ir.viewBox }),
    children: '__BRANCH_CHILDREN__',
  }).replace("'__BRANCH_CHILDREN__'", `[branchDiagram(${authoringCode})]`);

  return `import { branchDiagram, branchDiagramInputEmbedAdapter } from '@retikz/diagram-vanilla/branch';\nimport { renderToSvgString, scene } from '@retikz/vanilla';\nimport { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';\n\nconst input = scene(${figureCode});\n\nexport const svg = renderToSvgString(input, {\n  adapters: [branchDiagramInputEmbedAdapter],\n  output: ${formatVanillaValue(outputSize(preview))},\n  compile: { themeDefinitions: PreviewThemeDefinitionBundle.core },\n});\n`;
};

const buildBranchPreview = (
  preview: PreviewIR,
  composite: CompositeChild,
  options: BuildVanillaPreviewOptions,
): VanillaPreviewArtifact => {
  const source = BranchDiagramSchema.parse(composite);
  const input = scene({
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    ...(preview.ir.viewBox === undefined ? {} : { viewBox: preview.ir.viewBox }),
    children: [
      branchDiagram({
        ...branchAuthoringInput(source),
        entityKinds: PreviewThemeDefinitionBundle.graphEntityKinds,
        relationKinds: PreviewThemeDefinitionBundle.graphRelationKinds,
        diagramThemeDefinitions: PreviewThemeDefinitionBundle.diagram,
        graphThemeDefinitions: PreviewThemeDefinitionBundle.graph,
      }),
    ],
  });

  return {
    code: buildBranchCode(source, preview, options),
    svg: renderToSvgString(input, {
      adapters: [branchDiagramInputEmbedAdapter],
      output: outputSize(preview),
      compile: {
        themeDefinitions: PreviewThemeDefinitionBundle.core,
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

    if (
      effectiveComposites.length === 1 &&
      firstComposite.namespace === 'diagram' &&
      firstComposite.type === 'branch'
    ) {
      return buildBranchPreview(preview, firstComposite, options);
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
