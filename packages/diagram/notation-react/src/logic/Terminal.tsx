import type { TerminalInput } from '@retikz/notation';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { createTerminal, TerminalProvider } from '@retikz/notation';

import type { NotationEmbeddableComponent } from '../shared';

import { resolveSemanticNodeInput } from './authoring';

/** Terminal React 编写参数 */
export type TerminalProps = TerminalInput & Readonly<{ children?: ReactNode }>;

const terminalEmbeddableAdapter: EmbeddableTier2Adapter<TerminalProps> = {
  displayName: 'Terminal',
  contribute: props => {
    const { children, ...input } = props;
    return {
      node: createTerminal(resolveSemanticNodeInput(children, input)),
      providerDependencies: { roots: [TerminalProvider.key], providers: [TerminalProvider] },
    };
  },
};

const TerminalComponent: FC<TerminalProps> = () => null;

/** 将 Notation Terminal 接入 React 编写流程 */
export const Terminal = TerminalComponent as NotationEmbeddableComponent<TerminalProps>;

Terminal.displayName = 'Terminal';
Terminal.isTier2Embeddable = true;
Terminal.embeddableAdapter = terminalEmbeddableAdapter;
