import type { StageInput } from '@retikz/notation';
import type { InputStage } from '@retikz/notation-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { StageInputEmbedAdapter } from '@retikz/notation-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { NotationEmbeddableComponent } from '../shared';

import { collectSemanticNodeInput } from './authoring';

/** Stage React 编写参数 */
export type StageProps = StageInput & Readonly<{ children?: ReactNode }>;

/** 将 React 文字 children 组装为 Notation Vanilla Input */
const createStageInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, ...input } = props as StageProps;
  const collected = collectSemanticNodeInput(children, input, context.id);
  return withInputEmbedAdapters(collected.input satisfies InputStage, collected.adapters);
};

const StageComponent: FC<StageProps> = () => null;

/** 将 Notation Stage 接入 React 编写流程 */
export const Stage = StageComponent as NotationEmbeddableComponent<StageProps>;

Stage.displayName = 'Stage';
Stage.isTier2Embeddable = true;
Stage.inputEmbedAdapter = StageInputEmbedAdapter;
Stage.createInputEmbedProps = createStageInput;
