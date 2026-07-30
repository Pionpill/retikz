import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FlexLayoutInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createFlexLayout, LayoutItemKind } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import { makeReactStandardLayoutComposites, resolveReactLayoutItems, StandardLayoutReactNamespace } from '../shared';

/** React FlexLayout 接受的容器字段与语义 item children */
export type FlexLayoutProps = Omit<FlexLayoutInput, 'children'> & Readonly<{ children?: ReactNode }>;

const flexLayoutEmbeddableAdapter: EmbeddableTier2Adapter<FlexLayoutProps> = {
  displayName: 'FlexLayout',
  namespace: StandardLayoutReactNamespace,
  contribute: props => {
    const { children, ...input } = props;
    return {
      node: createFlexLayout({ ...input, children: resolveReactLayoutItems(children, LayoutItemKind.Flex) }),
      datasets: {},
      makeComposites: makeReactStandardLayoutComposites,
    };
  },
};

const FlexLayoutComponent: FC<FlexLayoutProps> = () => null;

/** Standard FlexLayout 的 React Tier 2 authoring 组件 */
export const FlexLayout = FlexLayoutComponent as StandardEmbeddableComponent<FlexLayoutProps>;

FlexLayout.displayName = 'FlexLayout';
FlexLayout.isTier2Embeddable = true;
FlexLayout.embeddableAdapter = flexLayoutEmbeddableAdapter;
