import type { DecisionInput } from '@retikz/notation';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { createDecision, DecisionProvider } from '@retikz/notation';

import type { NotationEmbeddableComponent } from '../shared';

import { resolveSemanticNodeInput } from './authoring';

/** Decision React 编写参数 */
export type DecisionProps = DecisionInput & Readonly<{ children?: ReactNode }>;

const decisionEmbeddableAdapter: EmbeddableTier2Adapter<DecisionProps> = {
  displayName: 'Decision',
  contribute: props => {
    const { children, ...input } = props;
    return {
      node: createDecision(resolveSemanticNodeInput(children, input)),
      providerDependencies: { roots: [DecisionProvider.key], providers: [DecisionProvider] },
    };
  },
};

const DecisionComponent: FC<DecisionProps> = () => null;

/** 将 Notation Decision 接入 React 编写流程 */
export const Decision = DecisionComponent as NotationEmbeddableComponent<DecisionProps>;

Decision.displayName = 'Decision';
Decision.isTier2Embeddable = true;
Decision.embeddableAdapter = decisionEmbeddableAdapter;
