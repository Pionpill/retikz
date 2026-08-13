import type { FlexLayoutInput } from '@retikz/layout';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { createFlexLayout, FlexLayoutProvider, LayoutItemKind } from '@retikz/layout';

import type { LayoutEmbeddableComponent } from '../shared';

import { resolveReactLayoutItems } from '../shared';

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
  contribute: props => {
    const { authoring, children, ...input } = props;
    void authoring;
    const resolved = resolveReactLayoutItems(children, LayoutItemKind.Flex);
    return {
      node: createFlexLayout({ ...input, children: resolved.items }),
      compositeDependencies: {
        roots: [FlexLayoutProvider.key, ...resolved.compositeDependencies.roots],
        providers: [FlexLayoutProvider, ...resolved.compositeDependencies.providers],
      },
      authoringSites: resolved.authoringSites,
    };
  },
};

const FlexLayoutComponent: FC<FlexLayoutProps> = () => null;

/** Layout Flex 布局的 React 声明组件 */
export const FlexLayout = FlexLayoutComponent as LayoutEmbeddableComponent<FlexLayoutProps>;

FlexLayout.displayName = 'FlexLayout';
FlexLayout.isTier2Embeddable = true;
FlexLayout.embeddableAdapter = flexLayoutEmbeddableAdapter;
