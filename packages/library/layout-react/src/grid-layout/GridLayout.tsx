import type { GridLayoutInput } from '@retikz/layout';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { createGridLayout, LayoutItemKind } from '@retikz/layout';

import type { LayoutEmbeddableComponent } from '../shared';

import { LayoutReactNamespace, makeReactLayoutComposites, resolveReactLayoutItems } from '../shared';

/** Grid 布局的 React 属性 */
export type GridLayoutProps = Omit<GridLayoutInput, 'children'> &
  Readonly<{
    /** 交给可选编译驱动解释的不透明声明数据 */
    authoring?: unknown;
    /** 必须由 Grid 类型布局项目组成的子元素 */
    children?: ReactNode;
  }>;

const gridLayoutEmbeddableAdapter: EmbeddableTier2Adapter<GridLayoutProps> = {
  displayName: 'GridLayout',
  namespace: LayoutReactNamespace,
  contribute: props => {
    const { authoring, children, ...input } = props;
    void authoring;
    const resolved = resolveReactLayoutItems(children, LayoutItemKind.Grid);
    return {
      node: createGridLayout({ ...input, children: resolved.items }),
      datasets: {},
      authoringSites: resolved.authoringSites,
      makeComposites: makeReactLayoutComposites,
    };
  },
};

const GridLayoutComponent: FC<GridLayoutProps> = () => null;

/** Layout Grid 布局的 React 声明组件 */
export const GridLayout = GridLayoutComponent as LayoutEmbeddableComponent<GridLayoutProps>;

GridLayout.displayName = 'GridLayout';
GridLayout.isTier2Embeddable = true;
GridLayout.embeddableAdapter = gridLayoutEmbeddableAdapter;
