import type { EmbeddableContribution, EmbeddableTier2Adapter } from '@retikz/react';
import type { JunctionInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createJunction, JunctionDefinition } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import { StandardJunctionReactNamespace } from '../shared';
import { resolveContent } from './authoring';

/** Junction 的 React 编写参数 */
export type JunctionProps = Omit<JunctionInput, 'content'> &
  Readonly<{
    /** 可选的 canonical JSON-safe content */
    content?: EmbeddableContribution['node'];
    /** 用作 content 的单个 React child */
    children?: ReactNode;
  }>;

const makeJunctionComposites = () => [JunctionDefinition];

const junctionEmbeddableAdapter: EmbeddableTier2Adapter<JunctionProps> = {
  displayName: 'Junction',
  namespace: StandardJunctionReactNamespace,
  contribute: props => {
    const { children, content, ...input } = props;
    const resolved = resolveContent(children, content, 'React Junction', false);
    return {
      node: createJunction({ ...input, ...(resolved === undefined ? {} : { content: resolved }) }),
      datasets: {},
      makeComposites: makeJunctionComposites,
    };
  },
};

const JunctionComponent: FC<JunctionProps> = () => null;

/** 将 Standard Junction 接入 React 编写流程的组件 */
export const Junction = JunctionComponent as StandardEmbeddableComponent<JunctionProps>;

Junction.displayName = 'Junction';
Junction.isTier2Embeddable = true;
Junction.embeddableAdapter = junctionEmbeddableAdapter;
