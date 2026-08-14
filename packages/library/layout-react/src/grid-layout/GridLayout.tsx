import type { GridLayoutInput } from '@retikz/layout';
import type { InputGridLayout } from '@retikz/layout-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { LayoutItemKind } from '@retikz/layout';
import { GridLayoutInputEmbedAdapter } from '@retikz/layout-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { LayoutEmbeddableComponent } from '../shared';

import { createInputLayoutItems } from '../shared';

/** Grid 布局的 React 属性 */
export type GridLayoutProps = Omit<GridLayoutInput, 'children'> &
  Readonly<{
    /** 交给可选编译驱动解释的不透明声明数据 */
    authoring?: unknown;
    /** 必须由 Grid 类型布局项目组成的子元素 */
    children?: ReactNode;
  }>;

/** 将 React LayoutItem children 组装为 Vanilla GridLayout 输入 */
const createGridLayoutInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { authoring: _authoring, children, ...input } = props as GridLayoutProps;
  void _authoring;
  const collected = createInputLayoutItems(children, LayoutItemKind.Grid, context);
  return withInputEmbedAdapters({ ...input, children: collected.items } satisfies InputGridLayout, collected.adapters);
};

const GridLayoutComponent: FC<GridLayoutProps> = () => null;

/** Layout Grid 布局的 React 声明组件 */
export const GridLayout = GridLayoutComponent as LayoutEmbeddableComponent<GridLayoutProps>;

GridLayout.displayName = 'GridLayout';
GridLayout.isTier2Embeddable = true;
GridLayout.inputEmbedAdapter = GridLayoutInputEmbedAdapter;
GridLayout.createInputEmbedProps = createGridLayoutInput;
