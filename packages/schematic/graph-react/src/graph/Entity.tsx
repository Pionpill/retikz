import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputEntity } from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { EntityInputEmbedAdapter } from '@retikz/graph-vanilla';

import type { GraphEmbeddableComponent } from '../shared';

import { collectEntityInput } from './authoring';

/** Entity Source 的 React 编写参数 */
export type EntityProps = Omit<InputEntity, 'type'> &
  GraphDefinitionOptions &
  Readonly<{
    /** 仅接受 Core Node-compatible 文本 authoring，与 text prop 互斥 */
    children?: ReactNode;
  }>;

const createEntityInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) =>
  collectEntityInput(props as EntityProps, context.id);

const EntityComponent: FC<EntityProps> = () => null;

/** 将 Entity Source 接入 React 编写流程 */
export const Entity = EntityComponent as GraphEmbeddableComponent<EntityProps>;

Entity.displayName = 'Entity';
Entity.isTier2Embeddable = true;
Entity.inputEmbedAdapter = EntityInputEmbedAdapter;
Entity.createInputEmbedProps = createEntityInput;
