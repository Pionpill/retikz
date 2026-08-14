import type { TerminalInput } from '@retikz/notation';
import type { InputTerminal } from '@retikz/notation-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { TerminalInputEmbedAdapter } from '@retikz/notation-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { NotationEmbeddableComponent } from '../shared';

import { collectSemanticNodeInput } from './authoring';

/** Terminal React 编写参数 */
export type TerminalProps = TerminalInput & Readonly<{ children?: ReactNode }>;

/** 将 React 文字 children 组装为 Notation Vanilla Input */
const createTerminalInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { children, ...input } = props as TerminalProps;
  const collected = collectSemanticNodeInput(children, input, context.id);
  return withInputEmbedAdapters(collected.input satisfies InputTerminal, collected.adapters);
};

const TerminalComponent: FC<TerminalProps> = () => null;

/** 将 Notation Terminal 接入 React 编写流程 */
export const Terminal = TerminalComponent as NotationEmbeddableComponent<TerminalProps>;

Terminal.displayName = 'Terminal';
Terminal.isTier2Embeddable = true;
Terminal.inputEmbedAdapter = TerminalInputEmbedAdapter;
Terminal.createInputEmbedProps = createTerminalInput;
