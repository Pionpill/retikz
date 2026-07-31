import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FlexLayoutInput, FlexLayoutInspectOptions } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createFlexLayout, FlexLayoutInspectOptionsInputSchema, LayoutItemKind } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import {
  createReactLayoutInspectionRoots,
  makeReactStandardLayoutComposites,
  resolveReactLayoutItems,
  StandardLayoutReactNamespace,
} from '../shared';

/** React FlexLayout 接受的容器字段与语义 item children */
export type FlexLayoutProps = Omit<FlexLayoutInput, 'children'> &
  Readonly<{ inspect?: boolean | FlexLayoutInspectOptions; children?: ReactNode }>;

const flexLayoutEmbeddableAdapter: EmbeddableTier2Adapter<FlexLayoutProps> = {
  displayName: 'FlexLayout',
  namespace: StandardLayoutReactNamespace,
  contribute: props => {
    const { children, inspect: inspectInput, ...input } = props;
    const inspect =
      typeof inspectInput === 'object' ? FlexLayoutInspectOptionsInputSchema.parse(inspectInput) : inspectInput;
    const resolved = resolveReactLayoutItems(children, LayoutItemKind.Flex);
    return {
      node: createFlexLayout({ ...input, children: resolved.items }),
      datasets: {},
      inspectionRoots: createReactLayoutInspectionRoots(inspect, resolved.inspectionChildren),
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
