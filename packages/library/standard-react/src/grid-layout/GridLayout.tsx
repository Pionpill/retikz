import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { GridLayoutInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createGridLayout, LayoutItemKind } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import { makeReactStandardLayoutComposites, resolveReactLayoutItems, StandardLayoutReactNamespace } from '../shared';

/** React GridLayout 接受的容器字段与语义 item children */
export type GridLayoutProps = Omit<GridLayoutInput, 'children'> & Readonly<{ children?: ReactNode }>;

const gridLayoutEmbeddableAdapter: EmbeddableTier2Adapter<GridLayoutProps> = {
  displayName: 'GridLayout',
  namespace: StandardLayoutReactNamespace,
  contribute: props => {
    const { children, ...input } = props;
    return {
      node: createGridLayout({ ...input, children: resolveReactLayoutItems(children, LayoutItemKind.Grid) }),
      datasets: {},
      makeComposites: makeReactStandardLayoutComposites,
    };
  },
};

const GridLayoutComponent: FC<GridLayoutProps> = () => null;

/** Standard GridLayout 的 React Tier 2 authoring 组件 */
export const GridLayout = GridLayoutComponent as StandardEmbeddableComponent<GridLayoutProps>;

GridLayout.displayName = 'GridLayout';
GridLayout.isTier2Embeddable = true;
GridLayout.embeddableAdapter = gridLayoutEmbeddableAdapter;
