import type { IRChartPlotExtension, IRChartSource } from '@retikz/chart';
import type { ChartAuthoringResult, ChartInput } from '@retikz/chart-vanilla';
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
    /** Chart 公共、具体 chartType 与 presentation declarations */
    children: ReactNode;
  }>;

type PointFactoryInput = Readonly<{
  data: Array<ExternalRow>;
  encodings: unknown;
  properties?: unknown;
  marks?: ReadonlyArray<unknown>;
}>;

type PlotExtensionAuthoringContext = Parameters<typeof resolvePlotExtensionAuthoring>[1];

type TypedPointChartDeclarations<TInput extends PointFactoryInput> = CollectedChartDeclarations &
  Readonly<{
    encodings: CollectedChartDeclaration<TInput['encodings']>;
    properties?: CollectedChartDeclaration<NonNullable<TInput['properties']>>;
    marks: ReadonlyArray<NonNullable<TInput['marks']>[number]>;
    presentation: Partial<Record<'title' | 'subtitle' | 'note' | 'source', unknown>>;
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
  ...(extension?.coordinate === undefined
    ? {}
    : { coordinate: { value: extension.coordinate, path: extensionPropPath(extensionPath, 'coordinate') } }),
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

/** 从 typed Point declarations 组装 Vanilla 精确输入 */
export const createTypedChartInput = <
  TProps extends TypedChartCommonProps<TSource>,
  TSource extends IRChartSource,
  TInput extends PointFactoryInput,
>(
  props: TProps,
  declarations: TypedPointChartDeclarations<TInput>,
  factory: (input: TInput) => ChartAuthoringResult<TSource>,
): ChartInput<TSource> => {
  const { id, theme, panel, themeDefinitions, lowerOptions } = props;
  assertEmbeddedChartLayout(declarations.layout);
  const data = declarations.data.props;
  const extensionParts = extensionPartsOf(declarations.extension);
  assertChartExtensionChildren(extensionParts.children);
  const plotAuthoring =
    declarations.extension !== undefined
      ? resolvePlotExtensionAuthoring(
          extensionParts.children,
          plotExtensionContextOf(data, extensionParts.extension, extensionParts.path),
        )
      : undefined;
  const effectivePlotExtension = plotExtensionOf(extensionParts.extension, plotAuthoring?.fragment);
  const effectiveLowerOptions = lowerOptionsWithPlotRuntimeOf(lowerOptions, plotAuthoring?.runtime ?? {});
  const presentation = declarations.presentation;
  const input = {
    data: data.data,
    ...(data.reference === undefined ? {} : { dataRef: data.reference }),
    ...(data.model === undefined ? {} : { dataModel: data.model }),
    ...(declarations.layout?.props.layout === undefined ? {} : { layout: declarations.layout.props.layout }),
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
    encodings: declarations.encodings.props,
    ...(declarations.properties === undefined ? {} : { properties: declarations.properties.props }),
    ...(declarations.marks.length === 0 ? {} : { marks: declarations.marks }),
  } as TInput;
  return factory(input).input;
};

/** 创建共享 InputEmbed 生命周期接线的 concrete Chart 组件 */
export const createTypedChartComponent = <TProps extends TypedChartCommonProps<TSource>, TSource extends IRChartSource>(
  displayName: string,
  createInput: (props: TProps) => ChartInput<TSource>,
): InputEmbeddableChartComponent<TProps, ChartInput<TSource>, typeof ChartInputEmbedAdapter> => {
  const Component: FC<TProps> = props => {
    const { children, lowerOptions, themeDefinitions } = props;
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
    const standalone = prepareStandaloneChartDeclarations(children);
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
