import type { StageInput } from '@retikz/notation';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { createStage, StageDefinition } from '@retikz/notation';

import type { NotationEmbeddableComponent } from '../shared';

import { NotationStageReactNamespace } from '../shared';
import { resolveSemanticNodeInput } from './authoring';

/** Stage React 编写参数 */
export type StageProps = StageInput & Readonly<{ children?: ReactNode }>;

const makeStageComposites = () => [StageDefinition];

const stageEmbeddableAdapter: EmbeddableTier2Adapter<StageProps> = {
  displayName: 'Stage',
  namespace: NotationStageReactNamespace,
  contribute: props => {
    const { children, ...input } = props;
    return {
      node: createStage(resolveSemanticNodeInput(children, input)),
      datasets: {},
      makeComposites: makeStageComposites,
    };
  },
};

const StageComponent: FC<StageProps> = () => null;

/** 将 Notation Stage 接入 React 编写流程 */
export const Stage = StageComponent as NotationEmbeddableComponent<StageProps>;

Stage.displayName = 'Stage';
Stage.isTier2Embeddable = true;
Stage.embeddableAdapter = stageEmbeddableAdapter;
