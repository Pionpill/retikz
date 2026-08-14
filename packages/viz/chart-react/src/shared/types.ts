import type { ChartThemeStyleDefinition } from '@retikz/chart';
import type { PlotThemeStyleDefinition } from '@retikz/plot';
import type { LayoutProps, ScopeProps } from '@retikz/react';
import type { FC } from 'react';

/** Chart 的四个 presentation shorthand */
export type ChartPresentationProps = Readonly<{
  /** Chart 标题 */
  title?: string;
  /** Chart 副标题 */
  subtitle?: string;
  /** Chart 注记 */
  note?: string;
  /** Chart 数据来源 */
  source?: string;
}>;

/** Chart standalone 复用的 Layout host 字段。嵌入时 Core `themeStyles` 由父 Layout 提供 */
export type ChartHostProps = Pick<
  LayoutProps,
  | 'width'
  | 'height'
  | 'className'
  | 'style'
  | 'renderer'
  | 'themeStyles'
  | 'runtime'
  | 'animate'
  | 'snapshotAt'
  | 'animationRef'
  | 'onArtifacts'
  | 'onCompileResult'
>;

/** Chart 整图根的 Scope 字段 */
export type ChartRootProps = Pick<ScopeProps, 'id' | 'transforms' | 'placement' | 'zIndex' | 'clip' | 'theme'> & {
  /** x 方向外层平移 */
  x?: number;
  /** y 方向外层平移 */
  y?: number;
};

/** Chart 与 Plot 的 runtime-only Theme definition 输入 */
export type ChartRuntimeThemeProps = {
  /** Chart-owned Theme definition；与同名 Core、Plot definition 一起完成 style resolution */
  chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
  /** Plot-owned Theme definition；供 Chart 内部 Plot lowering 使用 */
  plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
};

/** Chart 的 host、根和 presentation 公共字段 */
export type ChartCommonProps = ChartHostProps & ChartRootProps & ChartPresentationProps & ChartRuntimeThemeProps;

/** 可嵌入 Chart React component 的静态 Vanilla Input 契约 */
export type InputEmbeddableChartComponent<TProps, TInput, TAdapter> = FC<TProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: TAdapter;
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => TInput;
};
