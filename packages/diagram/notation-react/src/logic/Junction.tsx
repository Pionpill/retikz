import type { JunctionInput } from '@retikz/notation';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { createJunction, JunctionDefinition } from '@retikz/notation';

import type { NotationEmbeddableComponent } from '../shared';

import { NotationJunctionReactNamespace } from '../shared';
import { resolveSemanticNodeInput } from './authoring';

/** Junction React 编写参数 */
export type JunctionProps = JunctionInput & Readonly<{ children?: ReactNode }>;

const makeJunctionComposites = () => [JunctionDefinition];

const junctionEmbeddableAdapter: EmbeddableTier2Adapter<JunctionProps> = {
  displayName: 'Junction',
  namespace: NotationJunctionReactNamespace,
  contribute: props => {
    const { children, ...input } = props;
    return {
      node: createJunction(resolveSemanticNodeInput(children, input)),
      datasets: {},
      makeComposites: makeJunctionComposites,
    };
  },
};

const JunctionComponent: FC<JunctionProps> = () => null;

/** 将 Notation Junction 接入 React 编写流程 */
export const Junction = JunctionComponent as NotationEmbeddableComponent<JunctionProps>;

Junction.displayName = 'Junction';
Junction.isTier2Embeddable = true;
Junction.embeddableAdapter = junctionEmbeddableAdapter;
