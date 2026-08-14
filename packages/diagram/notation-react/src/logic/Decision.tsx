import type { DecisionInput } from '@retikz/notation';
import type { InputDecision } from '@retikz/notation-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { DecisionInputEmbedAdapter } from '@retikz/notation-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { NotationEmbeddableComponent } from '../shared';

import { collectSemanticNodeInput } from './authoring';

/** Decision React 编写参数 */
export type DecisionProps = DecisionInput & Readonly<{ children?: ReactNode }>;

/** 将 React 文字 children 组装为 Notation Vanilla Input */
const createDecisionInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, ...input } = props as DecisionProps;
  const collected = collectSemanticNodeInput(children, input, context.id);
  return withInputEmbedAdapters(collected.input satisfies InputDecision, collected.adapters);
};

const DecisionComponent: FC<DecisionProps> = () => null;

/** 将 Notation Decision 接入 React 编写流程 */
export const Decision = DecisionComponent as NotationEmbeddableComponent<DecisionProps>;

Decision.displayName = 'Decision';
Decision.isTier2Embeddable = true;
Decision.inputEmbedAdapter = DecisionInputEmbedAdapter;
Decision.createInputEmbedProps = createDecisionInput;
