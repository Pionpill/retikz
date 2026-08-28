import type { GraphDefinitionOptions } from '@retikz/graph';
import type { InputGroup } from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { GroupInputEmbedAdapter } from '@retikz/graph-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { GraphEmbeddableComponent } from '../shared';

import { collectGroupInput } from './authoring';

/** Group Source 的 React 编写参数 */
export type GroupProps = Omit<InputGroup, 'children'> &
  GraphDefinitionOptions &
  Readonly<{
    /** 任意 Kernel 或 Tier 2 semantic children */
    children?: ReactNode;
  }>;

const createGroupInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const collected = collectGroupInput(props, context.id);
  return withInputEmbedAdapters(collected.input, collected.adapters);
};

const GroupComponent: FC<GroupProps> = () => null;

/** 将 Group Source 接入 React 编写流程 */
export const Group = GroupComponent as GraphEmbeddableComponent<GroupProps>;

Group.displayName = 'Group';
Group.isTier2Embeddable = true;
Group.inputEmbedAdapter = GroupInputEmbedAdapter;
Group.createInputEmbedProps = createGroupInput;
