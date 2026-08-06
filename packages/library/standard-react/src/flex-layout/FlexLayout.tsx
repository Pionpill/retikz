import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FlexLayoutInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createFlexLayout, LayoutItemKind } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import { makeReactStandardLayoutComposites, resolveReactLayoutItems, StandardLayoutReactNamespace } from '../shared';

/** Flex 布局的 React 属性 */
export type FlexLayoutProps = Omit<FlexLayoutInput, 'children'> &
  Readonly<{
    /** 交给可选编译驱动解释的不透明声明数据 */
    authoring?: unknown;
    /** 必须由 Flex 类型布局项目组成的子元素 */
    children?: ReactNode;
  }>;

const flexLayoutEmbeddableAdapter: EmbeddableTier2Adapter<FlexLayoutProps> = {
  displayName: 'FlexLayout',
  namespace: StandardLayoutReactNamespace,
  contribute: props => {
    const { authoring, children, ...input } = props;
    void authoring;
    const resolved = resolveReactLayoutItems(children, LayoutItemKind.Flex);
    return {
      node: createFlexLayout({ ...input, children: resolved.items }),
      datasets: {},
      authoringSites: resolved.authoringSites,
      makeComposites: makeReactStandardLayoutComposites,
    };
  },
};

const FlexLayoutComponent: FC<FlexLayoutProps> = () => null;

/** Standard Flex 布局的 React 声明组件 */
export const FlexLayout = FlexLayoutComponent as StandardEmbeddableComponent<FlexLayoutProps>;

FlexLayout.displayName = 'FlexLayout';
FlexLayout.isTier2Embeddable = true;
FlexLayout.embeddableAdapter = flexLayoutEmbeddableAdapter;
