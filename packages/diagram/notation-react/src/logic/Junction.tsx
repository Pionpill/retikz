import type { JunctionInput } from '@retikz/notation';
import type { EmbeddableContribution, EmbeddableTier2Adapter, NodeProps } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { JunctionSchema } from '@retikz/notation';
import { buildIRWithContributions, Node } from '@retikz/react';
import { createElement } from 'react';

import type { NotationEmbeddableComponent } from '../shared';

import { NotationJunctionReactNamespace } from '../shared';

/** Junction React 编写参数，语义单元自身就是一个 Core Node */
export type JunctionProps = Omit<JunctionInput, 'shape'> & Readonly<{ children?: ReactNode }>;

const makeJunctionComposites = () => [];
const junctionShape = 'circle' as const;

const buildJunctionNode = (props: JunctionProps) => {
  const { children, ...input } = props;
  const nodeProps = { ...input, shape: junctionShape } as unknown as NodeProps;
  const node = buildIRWithContributions(createElement(Node, nodeProps, children)).ir.children[0];
  return JunctionSchema.parse(node) as EmbeddableContribution['node'];
};

const junctionEmbeddableAdapter: EmbeddableTier2Adapter<JunctionProps> = {
  displayName: 'Junction',
  namespace: NotationJunctionReactNamespace,
  contribute: props => ({ node: buildJunctionNode(props), datasets: {}, makeComposites: makeJunctionComposites }),
};

const JunctionComponent: FC<JunctionProps> = () => null;

/** 将 Notation Junction 接入 React 编写流程 */
export const Junction = JunctionComponent as NotationEmbeddableComponent<JunctionProps>;

Junction.displayName = 'Junction';
Junction.isTier2Embeddable = true;
Junction.embeddableAdapter = junctionEmbeddableAdapter;
