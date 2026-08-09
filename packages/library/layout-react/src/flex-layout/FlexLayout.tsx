import type { FlexLayoutInput } from '@retikz/layout';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { createFlexLayout, LayoutItemKind } from '@retikz/layout';

import type { LayoutEmbeddableComponent } from '../shared';

import { LayoutReactNamespace, makeReactLayoutComposites, resolveReactLayoutItems } from '../shared';

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
  namespace: LayoutReactNamespace,
  contribute: props => {
    const { authoring, children, ...input } = props;
    void authoring;
    const resolved = resolveReactLayoutItems(children, LayoutItemKind.Flex);
    return {
      node: createFlexLayout({ ...input, children: resolved.items }),
      datasets: {},
      authoringSites: resolved.authoringSites,
      makeComposites: makeReactLayoutComposites,
    };
  },
};

const FlexLayoutComponent: FC<FlexLayoutProps> = () => null;

/** Layout Flex 布局的 React 声明组件 */
export const FlexLayout = FlexLayoutComponent as LayoutEmbeddableComponent<FlexLayoutProps>;

FlexLayout.displayName = 'FlexLayout';
FlexLayout.isTier2Embeddable = true;
FlexLayout.embeddableAdapter = flexLayoutEmbeddableAdapter;
