import type { EmbeddableContribution, EmbeddableTier2Adapter } from '@retikz/react';
import type { DecisionInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createDecision, DecisionDefinition } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import { StandardDecisionReactNamespace } from '../shared';
import { resolveContent } from './authoring';

/** Decision 的 React 编写参数 */
export type DecisionProps = Omit<DecisionInput, 'content'> &
  Readonly<{
    /** 直接提供的 canonical JSON-safe content */
    content?: EmbeddableContribution['node'];
    /** 用作 content 的单个 React child */
    children?: ReactNode;
  }>;

const makeDecisionComposites = () => [DecisionDefinition];

const decisionEmbeddableAdapter: EmbeddableTier2Adapter<DecisionProps> = {
  displayName: 'Decision',
  namespace: StandardDecisionReactNamespace,
  contribute: props => {
    const { children, content, ...input } = props;
    const resolved = resolveContent(children, content, 'React Decision', true);
    return {
      node: createDecision({ ...input, content: resolved }),
      datasets: {},
      makeComposites: makeDecisionComposites,
    };
  },
};

const DecisionComponent: FC<DecisionProps> = () => null;

/** 将 Standard Decision 接入 React 编写流程的组件 */
export const Decision = DecisionComponent as StandardEmbeddableComponent<DecisionProps>;

Decision.displayName = 'Decision';
Decision.isTier2Embeddable = true;
Decision.embeddableAdapter = decisionEmbeddableAdapter;
