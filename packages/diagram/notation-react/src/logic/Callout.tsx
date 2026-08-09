import type { CalloutInput } from '@retikz/notation';
import type { EmbeddableContribution, EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { CalloutDefinition, createCallout } from '@retikz/notation';

import type { NotationEmbeddableComponent } from '../shared';

import { NotationCalloutReactNamespace } from '../shared';
import { resolveContent } from './authoring';

/** Callout 的 React 编写参数 */
export type CalloutProps = Omit<CalloutInput, 'content'> &
  Readonly<{
    /** 直接提供的 canonical JSON-safe content */
    content?: EmbeddableContribution['node'];
    /** 用作 content 的单个 React child */
    children?: ReactNode;
  }>;

const makeCalloutComposites = () => [CalloutDefinition];

const calloutEmbeddableAdapter: EmbeddableTier2Adapter<CalloutProps> = {
  displayName: 'Callout',
  namespace: NotationCalloutReactNamespace,
  contribute: props => {
    const { children, content, ...input } = props;
    const resolved = resolveContent(children, content, 'React Callout', true);
    return {
      node: createCallout({ ...input, content: resolved }),
      datasets: {},
      makeComposites: makeCalloutComposites,
    };
  },
};

const CalloutComponent: FC<CalloutProps> = () => null;

/** 将 Notation Callout 接入 React 编写流程的组件 */
export const Callout = CalloutComponent as NotationEmbeddableComponent<CalloutProps>;

Callout.displayName = 'Callout';
Callout.isTier2Embeddable = true;
Callout.embeddableAdapter = calloutEmbeddableAdapter;
