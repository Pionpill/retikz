import type { OverlayLayoutInput } from '@retikz/layout';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { createOverlayLayout, LayoutItemKind, OverlayLayoutProvider } from '@retikz/layout';

import type { LayoutEmbeddableComponent } from '../shared';

import { resolveReactLayoutItems } from '../shared';

/** Overlay 布局的 React 属性 */
export type OverlayLayoutProps = Omit<OverlayLayoutInput, 'children'> &
  Readonly<{
    /** 交给可选编译驱动解释的不透明声明数据 */
    authoring?: unknown;
    /** 必须由 Overlay 类型布局项目组成的子元素 */
    children?: ReactNode;
  }>;

const overlayLayoutEmbeddableAdapter: EmbeddableTier2Adapter<OverlayLayoutProps> = {
  displayName: 'OverlayLayout',
  contribute: props => {
    const { authoring, children, ...input } = props;
    void authoring;
    const resolved = resolveReactLayoutItems(children, LayoutItemKind.Overlay);
    return {
      node: createOverlayLayout({ ...input, children: resolved.items }),
      compositeDependencies: {
        roots: [OverlayLayoutProvider.key, ...resolved.compositeDependencies.roots],
        providers: [OverlayLayoutProvider, ...resolved.compositeDependencies.providers],
      },
      authoringSites: resolved.authoringSites,
    };
  },
};

const OverlayLayoutComponent: FC<OverlayLayoutProps> = () => null;

/** Layout Overlay 布局的 React 声明组件 */
export const OverlayLayout = OverlayLayoutComponent as LayoutEmbeddableComponent<OverlayLayoutProps>;

OverlayLayout.displayName = 'OverlayLayout';
OverlayLayout.isTier2Embeddable = true;
OverlayLayout.embeddableAdapter = overlayLayoutEmbeddableAdapter;
