import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { OverlayLayoutInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createOverlayLayout, LayoutItemKind } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import { makeReactStandardLayoutComposites, resolveReactLayoutItems, StandardLayoutReactNamespace } from '../shared';

/** React OverlayLayout 接受的容器字段与语义 item children */
export type OverlayLayoutProps = Omit<OverlayLayoutInput, 'children'> & Readonly<{ children?: ReactNode }>;

const overlayLayoutEmbeddableAdapter: EmbeddableTier2Adapter<OverlayLayoutProps> = {
  displayName: 'OverlayLayout',
  namespace: StandardLayoutReactNamespace,
  contribute: props => {
    const { children, ...input } = props;
    return {
      node: createOverlayLayout({ ...input, children: resolveReactLayoutItems(children, LayoutItemKind.Overlay) }),
      datasets: {},
      makeComposites: makeReactStandardLayoutComposites,
    };
  },
};

const OverlayLayoutComponent: FC<OverlayLayoutProps> = () => null;

/** Standard OverlayLayout 的 React Tier 2 authoring 组件 */
export const OverlayLayout = OverlayLayoutComponent as StandardEmbeddableComponent<OverlayLayoutProps>;

OverlayLayout.displayName = 'OverlayLayout';
OverlayLayout.isTier2Embeddable = true;
OverlayLayout.embeddableAdapter = overlayLayoutEmbeddableAdapter;
