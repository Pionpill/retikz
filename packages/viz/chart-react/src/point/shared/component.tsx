import type { IRChartPlotExtension, IRChartSource } from '@retikz/chart';
import type { ChartAuthoringResult, ChartInput } from '@retikz/chart-vanilla';
import type { InputChartCoordinate } from '@retikz/chart-vanilla';
import type { ExternalRow } from '@retikz/data';
import type { FC, ReactNode } from 'react';

import { ChartInputEmbedAdapter } from '@retikz/chart-vanilla';
import { resolvePlotExtensionAuthoring, usePlotThemeStyles } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { createElement, useMemo } from 'react';

import type {
  ChartDataProps,
  ChartDeclarationPath,
  ChartExtensionProps,
  ChartLayoutProps,
  ChartPanelProps,
  ChartThemeDefinitionsProps,
  CollectedChartDeclaration,
  CollectedChartDeclarations,
  InputEmbeddableChartComponent,
} from '../../shared';

import { RetikzChartReactError } from '../../error';
import {
  assertChartExtensionChildren,
  mergeThemeDefinitions,
  prepareStandaloneChartDeclarations,
  useChartThemeDefinitions,
} from '../../shared';
import { lowerOptionsWithAmbientThemeOf, lowerOptionsWithPlotRuntimeOf } from './helpers';

/** Point family concrete Chart 共用的 React 根属性 */
export type TypedChartCommonProps<TSource extends IRChartSource> = ChartPanelProps &
  ChartThemeDefinitionsProps &
  Pick<TSource, 'id' | 'theme'> &
  Readonly<{
    /** 运行时数据行；不写入 Chart Source */
    rows?: Array<ExternalRow>;
    /** Chart Source 数据配置 */
    data?: TSource['data'];
    /** Chart Source 外层尺寸 */
    layout?: TSource['layout'];
    /** Chart 根坐标系选择；与 `ChartCoordinate` declaration 互斥 */
    coordinate?: InputChartCoordinate;
    /** Chart 固定 presentation slots */
    presentation?: TSource['presentation'];
    /** 当前 chartType 的 exact recipe slots；chartType 由具体组件身份确定 */
    recipe?: Partial<Omit<TSource['recipe'], 'chartType'>>;
    /** 显式 Plot-owned fragment */
    plotExtension?: TSource['plotExtension'];
    /** 与结构化根配置等价的 headless declarations */
    children?: ReactNode;
  }>;

type PointFactoryInput = Readonly<{
  data: Array<ExternalRow>;
  coordinate?: InputChartCoordinate;
  encodings: unknown;
  properties?: unknown;
  marks?: ReadonlyArray<unknown>;
}>;

type PlotExtensionAuthoringContext = Parameters<typeof resolvePlotExtensionAuthoring>[1];

type TypedPointChartDeclarations<TInput extends PointFactoryInput> = CollectedChartDeclarations &
  Readonly<{
    encodings?: CollectedChartDeclaration<TInput['encodings']>;
    properties?: CollectedChartDeclaration<NonNullable<TInput['properties']>>;
    marks?: ReadonlyArray<NonNullable<TInput['marks']>[number]>;
    presentation: Partial<Record<'title' | 'subtitle' | 'note' | 'source', unknown>>;
  }>;

type TypedChartRootRecipe<TInput extends PointFactoryInput> = Readonly<{
  encodings?: TInput['encodings'];
  properties?: TInput['properties'];
  marks?: TInput['marks'];
}>;

const dataFieldNamesOf = (rows: Array<ExternalRow>): ReadonlySet<string> =>
  new Set(rows.flatMap(row => Object.keys(row)));

const extensionPropPath = (path: ChartDeclarationPath, prop: string): ChartDeclarationPath => [...path, 'props', prop];

const plotExtensionContextOf = (
  data: ChartDataProps,
  extension: IRChartPlotExtension | undefined,
  extensionPath: ChartDeclarationPath,
): PlotExtensionAuthoringContext => ({
  data: { reference: data.reference ?? 'chart.data', ...(data.model === undefined ? {} : { model: data.model }) },
  ...(data.model === undefined ? {} : { model: data.model }),
  dataFieldNames: dataFieldNamesOf(data.data),
  ...(extension?.scales === undefined
    ? {}
    : { scales: { value: extension.scales, path: extensionPropPath(extensionPath, 'scales') } }),
  ...(extension?.composition === undefined
    ? {}
    : { composition: { value: extension.composition, path: extensionPropPath(extensionPath, 'composition') } }),
  ...(extension?.guides === undefined
    ? {}
    : { guides: { value: extension.guides, path: extensionPropPath(extensionPath, 'guides') } }),
  ...(extension?.marks === undefined
    ? {}
    : { marks: { value: extension.marks, path: extensionPropPath(extensionPath, 'marks') } }),
  ...(extension?.transform === undefined ? {} : { dataTransforms: extension.transform }),
});

const plotExtensionOf = (
  extension: IRChartPlotExtension | undefined,
  fragment: ReturnType<typeof resolvePlotExtensionAuthoring>['fragment'] | undefined,
): IRChartPlotExtension | undefined => {
  if (fragment === undefined) return extension;
  const passive = {
    ...(extension?.plotThemeTokens === undefined ? {} : { plotThemeTokens: extension.plotThemeTokens }),
    ...(extension?.plotThemeTokenRules === undefined ? {} : { plotThemeTokenRules: extension.plotThemeTokenRules }),
    ...(extension?.plotTheme === undefined ? {} : { plotTheme: extension.plotTheme }),
    ...(extension?.meta === undefined ? {} : { meta: extension.meta }),
  };
  const combined = { ...passive, ...fragment };
  return Object.keys(combined).length === 0 ? undefined : combined;
};

const extensionPartsOf = (
  declaration: CollectedChartDeclaration<ChartExtensionProps> | undefined,
): Readonly<{
  children?: ReactNode;
  extension?: IRChartPlotExtension;
  path: ChartDeclarationPath;
}> => {
  if (declaration === undefined) return { path: ['children'] };
  const { children, ...extension } = declaration.props;
  return {
    ...(children === undefined ? {} : { children }),
    ...(Object.keys(extension).length === 0 ? {} : { extension }),
    path: declaration.path,
  };
};

const assertEmbeddedChartLayout = (declaration: CollectedChartDeclaration<ChartLayoutProps> | undefined): void => {
  if (declaration === undefined) return;
  const unsupportedDimensions = (['width', 'height'] as const).filter(dimension =>
    Object.hasOwn(declaration.props, dimension),
  );
  if (unsupportedDimensions.length === 0) return;
  throw new RetikzChartReactError(
    `chart react: embedded Chart does not support ChartLayout ${unsupportedDimensions.join(', ')}; move host dimensions to the outer <Layout>`,
  );
};

const rootDeclarationConflictError = (slot: string, declaration: string): RetikzChartReactError =>
  new RetikzChartReactError(
    `chart react: ${slot} cannot be provided by both the concrete Chart root prop and ${declaration}`,
  );

const presentationOf = <TSource extends IRChartSource>(
  rootPresentation: TSource['presentation'] | undefined,
  declarationPresentation: TypedPointChartDeclarations<PointFactoryInput>['presentation'],
): Partial<Record<'title' | 'subtitle' | 'note' | 'source', unknown>> => {
  const presentation: Partial<Record<'title' | 'subtitle' | 'note' | 'source', unknown>> = {};
  for (const slot of ['title', 'subtitle', 'note', 'source'] as const) {
    const hasRootSlot = rootPresentation !== undefined && Object.hasOwn(rootPresentation, slot);
    const hasDeclarationSlot = Object.hasOwn(declarationPresentation, slot);
    if (hasRootSlot && hasDeclarationSlot) {
      throw rootDeclarationConflictError(`presentation.${slot}`, `<Chart${slot[0].toUpperCase()}${slot.slice(1)}>`);
    }
    const value = hasRootSlot ? rootPresentation[slot] : declarationPresentation[slot];
    if (value !== undefined) presentation[slot] = value;
  }
  return presentation;
};

/** 从 typed Point declarations 组装 Vanilla 精确输入 */
export const createTypedChartInput = <
  TProps extends TypedChartCommonProps<TSource>,
  TSource extends IRChartSource,
  TInput extends PointFactoryInput,
>(
  props: TProps,
  declarations: TypedPointChartDeclarations<TInput>,
  factory: (input: TInput) => ChartAuthoringResult<TSource>,
  encodingsDeclarationName: string,
): ChartInput<TSource> => {
  const {
    id,
    theme,
    rows: rootRows,
    data: rootData,
    layout: rootLayout,
    coordinate: rootCoordinate,
    presentation: rootPresentation,
    recipe,
    plotExtension: rootPlotExtension,
    panel,
    themeDefinitions,
    lowerOptions,
  } = props;
  const rootRecipe = recipe as TypedChartRootRecipe<TInput> | undefined;
  const hasRootData = Object.hasOwn(props, 'rows') || Object.hasOwn(props, 'data');
  const hasRootLayout = Object.hasOwn(props, 'layout');
  const hasRootCoordinate = Object.hasOwn(props, 'coordinate');
  const hasRootPlotExtension = Object.hasOwn(props, 'plotExtension');
  const hasRootEncodings = rootRecipe !== undefined && Object.hasOwn(rootRecipe, 'encodings');
  const hasRootProperties = rootRecipe !== undefined && Object.hasOwn(rootRecipe, 'properties');
  const hasRootMarks = rootRecipe !== undefined && Object.hasOwn(rootRecipe, 'marks');

  if (hasRootData && declarations.data !== undefined) {
    throw rootDeclarationConflictError('data', '<ChartData>');
  }
  if (hasRootLayout && declarations.layout !== undefined) {
    throw rootDeclarationConflictError('layout', '<ChartLayout>');
  }
  if (hasRootCoordinate && declarations.coordinate !== undefined) {
    throw rootDeclarationConflictError('coordinate', '<ChartCoordinate>');
  }
  if (hasRootPlotExtension && declarations.extension !== undefined) {
    throw rootDeclarationConflictError('plotExtension', '<ChartExtension>');
  }
  if (hasRootEncodings && declarations.encodings !== undefined) {
    throw rootDeclarationConflictError('recipe.encodings', 'the chartType encodings declaration');
  }
  if (hasRootProperties && declarations.properties !== undefined) {
    throw rootDeclarationConflictError('recipe.properties', 'the chartType properties declaration');
  }
  if (hasRootMarks && declarations.marks !== undefined) {
    throw rootDeclarationConflictError('recipe.marks', 'a chartType mark declaration');
  }

  assertEmbeddedChartLayout(declarations.layout);
  if (!hasRootData && declarations.data === undefined) {
    throw new RetikzChartReactError('chart react: ChartData must appear exactly once');
  }
  const rows = hasRootData ? rootRows : declarations.data?.props.data;
  if (rows === undefined) {
    throw new RetikzChartReactError(
      'chart react: runtime rows are required from the concrete Chart root or <ChartData>',
    );
  }
  const data = hasRootData
    ? {
        data: rows,
        ...(rootData?.reference === undefined ? {} : { reference: rootData.reference }),
        ...(rootData?.model === undefined ? {} : { model: rootData.model }),
      }
    : declarations.data?.props;
  if (data === undefined) {
    throw new RetikzChartReactError(
      'chart react: runtime rows are required from the concrete Chart root or <ChartData>',
    );
  }

  const encodings = hasRootEncodings ? rootRecipe.encodings : declarations.encodings?.props;
  if (encodings === undefined) {
    if (!hasRootData && recipe === undefined) {
      throw new RetikzChartReactError(`chart react: ${encodingsDeclarationName} must appear exactly once`);
    }
    throw new RetikzChartReactError(
      'chart react: recipe encodings are required from the concrete Chart root or the chartType encodings declaration',
    );
  }
  const properties = hasRootProperties ? rootRecipe.properties : declarations.properties?.props;
  const marks = hasRootMarks ? rootRecipe.marks : declarations.marks;
  const extensionParts = extensionPartsOf(declarations.extension);
  assertChartExtensionChildren(extensionParts.children);
  const plotAuthoring =
    declarations.extension !== undefined
      ? resolvePlotExtensionAuthoring(
          extensionParts.children,
          plotExtensionContextOf(data, extensionParts.extension, extensionParts.path),
        )
      : undefined;
  const declaredPlotExtension = plotExtensionOf(extensionParts.extension, plotAuthoring?.fragment);
  const effectivePlotExtension = hasRootPlotExtension ? rootPlotExtension : declaredPlotExtension;
  const effectiveLowerOptions = lowerOptionsWithPlotRuntimeOf(lowerOptions, plotAuthoring?.runtime ?? {});
  const presentation = presentationOf<TSource>(rootPresentation, declarations.presentation);
  const effectiveLayout = hasRootLayout ? rootLayout : declarations.layout?.props.layout;
  const effectiveCoordinate = hasRootCoordinate ? rootCoordinate : declarations.coordinate?.props.coordinate;
  const input = {
    data: data.data,
    ...(data.reference === undefined ? {} : { dataRef: data.reference }),
    ...(data.model === undefined ? {} : { dataModel: data.model }),
    ...(effectiveLayout === undefined ? {} : { layout: effectiveLayout }),
    ...(effectiveCoordinate === undefined ? {} : { coordinate: effectiveCoordinate }),
    ...(id === undefined ? {} : { id }),
    ...(theme === undefined ? {} : { theme }),
    ...(effectivePlotExtension === undefined ? {} : { plotExtension: effectivePlotExtension }),
    ...(panel === undefined ? {} : { panel }),
    ...(themeDefinitions === undefined ? {} : { themeDefinitions }),
    ...(effectiveLowerOptions === undefined ? {} : { lowerOptions: effectiveLowerOptions }),
    ...(presentation.title === undefined ? {} : { title: presentation.title }),
    ...(presentation.subtitle === undefined ? {} : { subtitle: presentation.subtitle }),
    ...(presentation.note === undefined ? {} : { note: presentation.note }),
    ...(presentation.source === undefined ? {} : { source: presentation.source }),
    encodings,
    ...(properties === undefined ? {} : { properties }),
    ...(marks === undefined ? {} : { marks }),
  } as TInput;
  return factory(input).input;
};

/** 创建共享 InputEmbed 生命周期接线的 concrete Chart 组件 */
export const createTypedChartComponent = <TProps extends TypedChartCommonProps<TSource>, TSource extends IRChartSource>(
  displayName: string,
  createInput: (props: TProps) => ChartInput<TSource>,
): InputEmbeddableChartComponent<TProps, ChartInput<TSource>, typeof ChartInputEmbedAdapter> => {
  const Component: FC<TProps> = props => {
    const { children, layout, lowerOptions, themeDefinitions } = props;
    const ambientThemeDefinitions = useChartThemeDefinitions();
    const ambientPlotThemeStyles = usePlotThemeStyles();
    const effectiveProps = useMemo<TProps>(() => {
      const effectiveThemeDefinitions = mergeThemeDefinitions(themeDefinitions, ambientThemeDefinitions);
      const effectiveLowerOptions = lowerOptionsWithAmbientThemeOf(lowerOptions, ambientPlotThemeStyles);
      return {
        ...props,
        ...(effectiveThemeDefinitions === undefined ? {} : { themeDefinitions: effectiveThemeDefinitions }),
        ...(effectiveLowerOptions === undefined ? {} : { lowerOptions: effectiveLowerOptions }),
      };
    }, [ambientPlotThemeStyles, ambientThemeDefinitions, themeDefinitions, lowerOptions, props]);
    const standalone = prepareStandaloneChartDeclarations(children, layout);
    const embeddedProps = { ...effectiveProps, children: standalone.children };
    return createElement(Layout, standalone.host, createElement(Component, embeddedProps));
  };
  const chart = Component as InputEmbeddableChartComponent<TProps, ChartInput<TSource>, typeof ChartInputEmbedAdapter>;
  chart.displayName = displayName;
  chart.isTier2Embeddable = true;
  chart.inputEmbedAdapter = ChartInputEmbedAdapter;
  chart.createInputEmbedProps = props => createInput(props as TProps);
  return chart;
};
