import type { EmbeddableContribution, EmbeddableTier2Adapter } from '@retikz/react';
import type { StageInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createStage, StageDefinition } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import { StandardStageReactNamespace } from '../shared';
import { resolveContent } from './authoring';

/** Stage 的 React 编写参数 */
export type StageProps = Omit<StageInput, 'content'> &
  Readonly<{
    /** 直接提供的 canonical JSON-safe content */
    content?: EmbeddableContribution['node'];
    /** 用作 content 的单个 React child */
    children?: ReactNode;
  }>;

const makeStageComposites = () => [StageDefinition];

const stageEmbeddableAdapter: EmbeddableTier2Adapter<StageProps> = {
  displayName: 'Stage',
  namespace: StandardStageReactNamespace,
  contribute: props => {
    const { children, content, ...input } = props;
    const resolved = resolveContent(children, content, 'React Stage', true);
    return { node: createStage({ ...input, content: resolved }), datasets: {}, makeComposites: makeStageComposites };
  },
};

const StageComponent: FC<StageProps> = () => null;

/** 将 Standard Stage 接入 React 编写流程的组件 */
export const Stage = StageComponent as StandardEmbeddableComponent<StageProps>;

Stage.displayName = 'Stage';
Stage.isTier2Embeddable = true;
Stage.embeddableAdapter = stageEmbeddableAdapter;
