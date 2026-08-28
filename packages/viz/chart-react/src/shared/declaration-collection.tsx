import type { ReactElement, ReactNode } from 'react';

import { createElement, Fragment, isValidElement } from 'react';

import type { ChartDataProps } from './ChartData';
import type { ChartExtensionProps } from './ChartExtension';
import type { ChartLayoutProps } from './ChartLayout';

import { RetikzChartReactError } from '../error';
import { ChartData } from './ChartData';
import { ChartExtension } from './ChartExtension';
import { ChartLayout } from './ChartLayout';

/** Chart declaration 在原始 children 中的稳定 slot 路径 */
export type ChartDeclarationPath = ReadonlyArray<string | number>;

/** 携带原始 slot 路径的 Chart declaration */
export type CollectedChartDeclaration<TProps> = Readonly<{
  props: TProps;
  path: ChartDeclarationPath;
}>;

/** Chart 公共 declaration 收集结果 */
export type CollectedChartDeclarations = Readonly<{
  data: CollectedChartDeclaration<ChartDataProps>;
  layout?: CollectedChartDeclaration<ChartLayoutProps>;
  extension?: CollectedChartDeclaration<ChartExtensionProps>;
}>;

/** 具体 chartType declaration 的 direct-child 收集回调 */
export type CollectChartTypeDeclaration = (element: ReactElement, path: ChartDeclarationPath) => boolean;

const duplicateDeclarationError = (name: string, path: ChartDeclarationPath): RetikzChartReactError =>
  new RetikzChartReactError(`chart react: ${name} may appear at most once at ${JSON.stringify(path)}`);

/** 收集 Chart 公共 direct-child declarations，并把具体类型声明交给 chartType owner */
export const collectChartDeclarations = (
  children: ReactNode,
  collectChartTypeDeclaration: CollectChartTypeDeclaration,
): CollectedChartDeclarations => {
  let data: CollectedChartDeclaration<ChartDataProps> | undefined;
  let layout: CollectedChartDeclaration<ChartLayoutProps> | undefined;
  let extension: CollectedChartDeclaration<ChartExtensionProps> | undefined;

  const visit = (value: ReactNode, path: ChartDeclarationPath): void => {
    if (Array.isArray(value)) {
      value.forEach((child, index) => visit(child, [...path, index]));
      return;
    }
    if (value === null || value === undefined || typeof value === 'boolean') return;
    if (!isValidElement(value)) {
      throw new RetikzChartReactError(
        `chart react: unsupported direct Chart child at ${JSON.stringify(path)}; place Plot declarations inside <ChartExtension>`,
      );
    }
    if (value.type === Fragment) {
      visit(value.props.children as ReactNode, [...path, 'children']);
      return;
    }
    if (value.type === ChartData) {
      if (data !== undefined) throw duplicateDeclarationError('ChartData', path);
      data = { props: value.props as ChartDataProps, path };
      return;
    }
    if (value.type === ChartLayout) {
      if (layout !== undefined) throw duplicateDeclarationError('ChartLayout', path);
      layout = { props: value.props as ChartLayoutProps, path };
      return;
    }
    if (value.type === ChartExtension) {
      if (extension !== undefined) throw duplicateDeclarationError('ChartExtension', path);
      extension = { props: value.props as ChartExtensionProps, path };
      return;
    }
    if (collectChartTypeDeclaration(value, path)) return;
    throw new RetikzChartReactError(
      `chart react: unsupported direct Chart child at ${JSON.stringify(path)}; place Plot declarations inside <ChartExtension>`,
    );
  };

  visit(children, ['children']);
  if (data === undefined) throw new RetikzChartReactError('chart react: ChartData must appear exactly once');
  return { data, ...(layout === undefined ? {} : { layout }), ...(extension === undefined ? {} : { extension }) };
};

const assertPositiveFiniteDimension = (name: 'width' | 'height', value: number | undefined): void => {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value <= 0) {
    throw new RetikzChartReactError(`chart react: ChartLayout ${name} must be a positive finite number`);
  }
};

const sourceLayoutOf = (props: ChartLayoutProps): ChartLayoutProps['layout'] => {
  if (props.layout !== undefined) return props.layout;
  const mirrored = {
    ...(props.width === undefined ? {} : { width: props.width }),
    ...(props.height === undefined ? {} : { height: props.height }),
  };
  return Object.keys(mirrored).length === 0 ? undefined : mirrored;
};

/** standalone Chart 交给 Layout host 的尺寸与已移除 host dimensions 的 children */
export type StandaloneChartDeclarations = Readonly<{
  children: ReactNode;
  host: Pick<ChartLayoutProps, 'width' | 'height'>;
}>;

/** 为 standalone Chart 提取 host 尺寸，并把镜像后的 Source layout 留给内部 InputEmbed */
export const prepareStandaloneChartDeclarations = (children: ReactNode): StandaloneChartDeclarations => {
  let layoutCount = 0;
  const visit = (value: ReactNode): ReactNode => {
    if (Array.isArray(value)) return value.map(visit);
    if (!isValidElement(value)) return value;
    if (value.type === Fragment)
      return createElement(Fragment, { key: value.key }, visit(value.props.children as ReactNode));
    if (value.type !== ChartLayout) return value;
    layoutCount += 1;
    if (layoutCount > 1) throw duplicateDeclarationError('ChartLayout', ['children']);
    const props = value.props as ChartLayoutProps;
    assertPositiveFiniteDimension('width', props.width);
    assertPositiveFiniteDimension('height', props.height);
    const layout = sourceLayoutOf(props);
    return layout === undefined ? null : createElement(ChartLayout, { key: value.key, layout });
  };
  const preparedChildren = visit(children);

  let host: Pick<ChartLayoutProps, 'width' | 'height'> = {};
  const readHost = (value: ReactNode): void => {
    if (Array.isArray(value)) {
      value.forEach(readHost);
      return;
    }
    if (!isValidElement(value)) return;
    if (value.type === Fragment) {
      readHost(value.props.children as ReactNode);
      return;
    }
    if (value.type !== ChartLayout) return;
    const props = value.props as ChartLayoutProps;
    host = {
      ...(props.width === undefined ? {} : { width: props.width }),
      ...(props.height === undefined ? {} : { height: props.height }),
    };
  };
  readHost(children);
  return { children: preparedChildren, host };
};

const isOrdinaryIterable = (value: unknown): value is Iterable<unknown> =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !isValidElement(value) &&
  Symbol.iterator in value;

/** 拒绝 ChartExtension 不支持的普通 iterable 容器语法 */
export const assertChartExtensionChildren = (children: ReactNode): void => {
  const visit = (value: ReactNode): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (isOrdinaryIterable(value)) {
      throw new RetikzChartReactError(
        'chart react: ChartExtension children support Plot declarations, arrays, Fragment, and empty slots',
      );
    }
    if (isValidElement(value) && value.type === Fragment) visit(value.props.children as ReactNode);
  };
  visit(children);
};
