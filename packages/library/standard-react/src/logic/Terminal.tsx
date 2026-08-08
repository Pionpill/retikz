import type { EmbeddableContribution, EmbeddableTier2Adapter, NodeProps } from '@retikz/react';
import type { TerminalInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { buildIRWithContributions, Node } from '@retikz/react';
import { TerminalSchema } from '@retikz/standard';
import { createElement } from 'react';

import type { StandardEmbeddableComponent } from '../shared';

import { StandardTerminalReactNamespace } from '../shared';

/** Terminal React 编写参数，语义单元自身就是一个 Core Node */
export type TerminalProps = Omit<TerminalInput, 'shape'> & Readonly<{ children?: ReactNode }>;

const makeTerminalComposites = () => [];
const terminalShape = { type: 'rectangle', params: { cornerRadius: 1_000_000 } } as const;

const buildTerminalNode = (props: TerminalProps) => {
  const { children, ...input } = props;
  const nodeProps = { ...input, shape: terminalShape } as unknown as NodeProps;
  const node = buildIRWithContributions(createElement(Node, nodeProps, children)).ir.children[0];
  return TerminalSchema.parse(node) as EmbeddableContribution['node'];
};

const terminalEmbeddableAdapter: EmbeddableTier2Adapter<TerminalProps> = {
  displayName: 'Terminal',
  namespace: StandardTerminalReactNamespace,
  contribute: props => ({ node: buildTerminalNode(props), datasets: {}, makeComposites: makeTerminalComposites }),
};

const TerminalComponent: FC<TerminalProps> = () => null;

/** 将 Standard Terminal 接入 React 编写流程 */
export const Terminal = TerminalComponent as StandardEmbeddableComponent<TerminalProps>;

Terminal.displayName = 'Terminal';
Terminal.isTier2Embeddable = true;
Terminal.embeddableAdapter = terminalEmbeddableAdapter;
