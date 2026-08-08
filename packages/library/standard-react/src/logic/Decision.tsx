import type { EmbeddableContribution, EmbeddableTier2Adapter, NodeProps } from '@retikz/react';
import type { DecisionInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { buildIRWithContributions, Node } from '@retikz/react';
import { DecisionSchema } from '@retikz/standard';
import { createElement } from 'react';

import type { StandardEmbeddableComponent } from '../shared';

import { StandardDecisionReactNamespace } from '../shared';

/** Decision React 编写参数，语义单元自身就是一个 Core Node */
export type DecisionProps = Omit<DecisionInput, 'shape'> & Readonly<{ children?: ReactNode }>;

const makeDecisionComposites = () => [];
const decisionShape = { type: 'diamond', params: { aspectRatio: 1.8 } } as const;

const buildDecisionNode = (props: DecisionProps) => {
  const { children, ...input } = props;
  const nodeProps = { ...input, shape: decisionShape } as unknown as NodeProps;
  const node = buildIRWithContributions(createElement(Node, nodeProps, children)).ir.children[0];
  return DecisionSchema.parse(node) as EmbeddableContribution['node'];
};

const decisionEmbeddableAdapter: EmbeddableTier2Adapter<DecisionProps> = {
  displayName: 'Decision',
  namespace: StandardDecisionReactNamespace,
  contribute: props => ({ node: buildDecisionNode(props), datasets: {}, makeComposites: makeDecisionComposites }),
};

const DecisionComponent: FC<DecisionProps> = () => null;

/** 将 Standard Decision 接入 React 编写流程 */
export const Decision = DecisionComponent as StandardEmbeddableComponent<DecisionProps>;

Decision.displayName = 'Decision';
Decision.isTier2Embeddable = true;
Decision.embeddableAdapter = decisionEmbeddableAdapter;
