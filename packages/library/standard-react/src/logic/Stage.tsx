import type { EmbeddableContribution, EmbeddableTier2Adapter, NodeProps } from '@retikz/react';
import type { StageInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { buildIRWithContributions, Node } from '@retikz/react';
import { StageSchema } from '@retikz/standard';
import { createElement } from 'react';

import type { StandardEmbeddableComponent } from '../shared';

import { StandardStageReactNamespace } from '../shared';

/** Stage React 编写参数，语义单元自身就是一个 Core Node */
export type StageProps = Omit<StageInput, 'shape'> & Readonly<{ children?: ReactNode }>;

const makeStageComposites = () => [];
const stageShape = { type: 'rectangle', params: { cornerRadius: 8 } } as const;

const buildStageNode = (props: StageProps) => {
  const { children, ...input } = props;
  const nodeProps = { ...input, shape: stageShape } as unknown as NodeProps;
  const node = buildIRWithContributions(createElement(Node, nodeProps, children)).ir.children[0];
  return StageSchema.parse(node) as EmbeddableContribution['node'];
};

const stageEmbeddableAdapter: EmbeddableTier2Adapter<StageProps> = {
  displayName: 'Stage',
  namespace: StandardStageReactNamespace,
  contribute: props => ({ node: buildStageNode(props), datasets: {}, makeComposites: makeStageComposites }),
};

const StageComponent: FC<StageProps> = () => null;

/** 将 Standard Stage 接入 React 编写流程 */
export const Stage = StageComponent as StandardEmbeddableComponent<StageProps>;

Stage.displayName = 'Stage';
Stage.isTier2Embeddable = true;
Stage.embeddableAdapter = stageEmbeddableAdapter;
