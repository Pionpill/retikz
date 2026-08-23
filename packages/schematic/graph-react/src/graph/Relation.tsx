import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputRelation } from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { RelationInputEmbedAdapter } from '@retikz/graph-vanilla';

import type { GraphEmbeddableComponent } from '../shared';

import { collectRelationInput } from './authoring';

/** Relation Source 的 React 编写参数 */
export type RelationProps = Omit<InputRelation, 'type'> &
  GraphDefinitionOptions &
  Readonly<{
    /** 可选 Core Step authoring，与 route / way prop 互斥 */
    children?: ReactNode;
  }>;

const createRelationInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) =>
  collectRelationInput(props as RelationProps, context.id);

const RelationComponent: FC<RelationProps> = () => null;

/** 将 Relation Source 接入 React 编写流程 */
export const Relation = RelationComponent as GraphEmbeddableComponent<RelationProps>;

Relation.displayName = 'Relation';
Relation.isTier2Embeddable = true;
Relation.inputEmbedAdapter = RelationInputEmbedAdapter;
Relation.createInputEmbedProps = createRelationInput;
