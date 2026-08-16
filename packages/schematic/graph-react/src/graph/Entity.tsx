import type { InputEntity } from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { EntityInputEmbedAdapter } from '@retikz/graph-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { GraphEmbeddableComponent } from '../shared';

import { collectSemanticNodeInput } from './authoring';

/** Entity 的 React 编写参数 */
export type EntityProps = Omit<InputEntity, 'authoringNode'> &
  Readonly<{
    /** React embed 的稳定身份，省略时由宿主 embed 路径派生 */
    id?: string;
    children?: ReactNode;
  }>;

/** 将 React 文字 children 组装为 Graph Vanilla Input */
const createEntityInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, ...input } = props as EntityProps;
  const collected = collectSemanticNodeInput(children, input, context.id);
  return withInputEmbedAdapters(collected.input satisfies InputEntity, collected.adapters);
};

const EntityComponent: FC<EntityProps> = () => null;

/** 将 Entity 接入 React 编写流程 */
export const Entity = EntityComponent as GraphEmbeddableComponent<EntityProps>;

Entity.displayName = 'Entity';
Entity.isTier2Embeddable = true;
Entity.inputEmbedAdapter = EntityInputEmbedAdapter;
Entity.createInputEmbedProps = createEntityInput;
