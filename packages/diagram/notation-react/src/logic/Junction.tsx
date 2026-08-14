import type { JunctionInput } from '@retikz/notation';
import type { InputJunction } from '@retikz/notation-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { JunctionInputEmbedAdapter } from '@retikz/notation-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { NotationEmbeddableComponent } from '../shared';

import { collectSemanticNodeInput } from './authoring';

/** Junction React 编写参数 */
export type JunctionProps = JunctionInput & Readonly<{ children?: ReactNode }>;

/** 将 React 文字 children 组装为 Notation Vanilla Input */
const createJunctionInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, ...input } = props as JunctionProps;
  const collected = collectSemanticNodeInput(children, input, context.id);
  return withInputEmbedAdapters(collected.input satisfies InputJunction, collected.adapters);
};

const JunctionComponent: FC<JunctionProps> = () => null;

/** 将 Notation Junction 接入 React 编写流程 */
export const Junction = JunctionComponent as NotationEmbeddableComponent<JunctionProps>;

Junction.displayName = 'Junction';
Junction.isTier2Embeddable = true;
Junction.inputEmbedAdapter = JunctionInputEmbedAdapter;
Junction.createInputEmbedProps = createJunctionInput;
