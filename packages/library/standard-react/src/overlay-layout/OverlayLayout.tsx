import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { OverlayLayoutInput, OverlayLayoutInspectOptions } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createOverlayLayout, LayoutItemKind, OverlayLayoutInspectOptionsInputSchema } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import {
  createReactLayoutInspectionRoots,
  makeReactStandardLayoutComposites,
  resolveReactLayoutItems,
  StandardLayoutReactNamespace,
} from '../shared';

/** React OverlayLayout 接受的容器字段与语义 item children */
export type OverlayLayoutProps = Omit<OverlayLayoutInput, 'children'> &
  Readonly<{ inspect?: boolean | OverlayLayoutInspectOptions; children?: ReactNode }>;

const overlayLayoutEmbeddableAdapter: EmbeddableTier2Adapter<OverlayLayoutProps> = {
  displayName: 'OverlayLayout',
  namespace: StandardLayoutReactNamespace,
  contribute: props => {
    const { children, inspect: inspectInput, ...input } = props;
    const inspect =
      typeof inspectInput === 'object' ? OverlayLayoutInspectOptionsInputSchema.parse(inspectInput) : inspectInput;
    const resolved = resolveReactLayoutItems(children, LayoutItemKind.Overlay);
    return {
      node: createOverlayLayout({ ...input, children: resolved.items }),
      datasets: {},
      inspectionRoots: createReactLayoutInspectionRoots(inspect, resolved.inspectionChildren),
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
