import type { EmbeddableContribution, EmbeddableTier2Adapter } from '@retikz/react';
import type { TerminalInput } from '@retikz/standard';
import type { FC, ReactNode } from 'react';

import { createTerminal, TerminalDefinition } from '@retikz/standard';

import type { StandardEmbeddableComponent } from '../shared';

import { StandardTerminalReactNamespace } from '../shared';
import { resolveContent } from './authoring';

/** Terminal 的 React 编写参数 */
export type TerminalProps = Omit<TerminalInput, 'content'> &
  Readonly<{
    /** 直接提供的 canonical JSON-safe content */
    content?: EmbeddableContribution['node'];
    /** 用作 content 的单个 React child */
    children?: ReactNode;
  }>;

const makeTerminalComposites = () => [TerminalDefinition];

const terminalEmbeddableAdapter: EmbeddableTier2Adapter<TerminalProps> = {
  displayName: 'Terminal',
  namespace: StandardTerminalReactNamespace,
  contribute: props => {
    const { children, content, ...input } = props;
    const resolved = resolveContent(children, content, 'React Terminal', false);
    return {
      node: createTerminal({ ...input, ...(resolved === undefined ? {} : { content: resolved }) }),
      datasets: {},
      makeComposites: makeTerminalComposites,
    };
  },
};

const TerminalComponent: FC<TerminalProps> = () => null;

/** 将 Standard Terminal 接入 React 编写流程的组件 */
export const Terminal = TerminalComponent as StandardEmbeddableComponent<TerminalProps>;

Terminal.displayName = 'Terminal';
Terminal.isTier2Embeddable = true;
Terminal.embeddableAdapter = terminalEmbeddableAdapter;
