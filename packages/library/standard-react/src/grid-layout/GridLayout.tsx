import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { GridLayoutInput, GridLayoutInspectOptions } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createGridLayout, GridLayoutInspectOptionsInputSchema, LayoutItemKind } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import {
  createReactLayoutInspectionRoots,
  makeReactStandardLayoutComposites,
  resolveReactLayoutItems,
  StandardLayoutReactNamespace,
} from '../shared';

/** React GridLayout 接受的容器字段与语义 item children */
export type GridLayoutProps = Omit<GridLayoutInput, 'children'> &
  Readonly<{ inspect?: boolean | GridLayoutInspectOptions; children?: ReactNode }>;

const gridLayoutEmbeddableAdapter: EmbeddableTier2Adapter<GridLayoutProps> = {
  displayName: 'GridLayout',
  namespace: StandardLayoutReactNamespace,
  contribute: props => {
    const { children, inspect: inspectInput, ...input } = props;
    const inspect =
      typeof inspectInput === 'object' ? GridLayoutInspectOptionsInputSchema.parse(inspectInput) : inspectInput;
    const resolved = resolveReactLayoutItems(children, LayoutItemKind.Grid);
    return {
      node: createGridLayout({ ...input, children: resolved.items }),
      datasets: {},
      inspectionRoots: createReactLayoutInspectionRoots(inspect, resolved.inspectionChildren),
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
