import {
  ConnectorProvider,
  DecisionProvider,
  JunctionProvider,
  StageProvider,
  TerminalProvider,
} from '@retikz/notation';
import { createInputScene, Node, Step, Text } from '@retikz/react';
import { normalizeScene } from '@retikz/vanilla';
import { createElement, Fragment } from 'react';
import { describe, expect, it } from 'vitest';

import { Connector, Decision, Junction, LogicFrame, LogicFrameHeader, Stage, Terminal } from '../../src';

/** 经 React JSX 到 Vanilla Input 的唯一 authoring 链路归一化 */
const normalizeReactInput = (children: Parameters<typeof createInputScene>[0]) => {
  const input = createInputScene(children);
  return normalizeScene(input.scene, { adapters: input.adapters });
};

describe('@retikz/notation-react package boundary', () => {
  it('does not expose Callout authoring', async () => {
    const notationReact = await import('../../src');

    expect(notationReact).not.toHaveProperty('Callout');
  });
});

describe('Notation React semantic unit authoring', () => {
  it('preserves an explicit LogicFrame identity through the Vanilla adapter', () => {
    const result = normalizeReactInput(
      createElement(
        LogicFrame,
        { id: 'order' },
        createElement(LogicFrameHeader, null, createElement(Node, { position: [0, 0], text: 'Order' })),
      ),
    );

    expect(result.ir.children[0]).toMatchObject({ namespace: 'notation', type: 'logicFrame', id: 'order' });
  });

  it('keeps semantic IR while supporting the same text children as Core Node', () => {
    const stage = normalizeReactInput(createElement(Stage, { id: 'stage', position: [0, 0] }, 'Process'));
    const terminal = normalizeReactInput(
      createElement(Terminal, { id: 'terminal', position: [0, 0] }, createElement(Text, null, 'Start')),
    );

    expect(stage.ir.children[0]).toMatchObject({
      namespace: 'notation',
      type: 'stage',
      id: 'stage',
      text: 'Process',
    });
    expect(terminal.ir.children[0]).toMatchObject({
      namespace: 'notation',
      type: 'terminal',
      id: 'terminal',
      text: 'Start',
    });
    expect(stage.contributions[0]).toEqual({ roots: [StageProvider.key], providers: [StageProvider] });
    expect(terminal.contributions[0]).toEqual({ roots: [TerminalProvider.key], providers: [TerminalProvider] });
  });

  it('contributes the matching Definition for every semantic unit', () => {
    const result = normalizeReactInput(
      createElement(
        Fragment,
        null,
        createElement(Decision, { id: 'decision', position: [0, 0] }),
        createElement(Junction, { id: 'junction', position: [20, 0] }),
      ),
    );

    expect(result.ir.children).toMatchObject([
      { namespace: 'notation', type: 'decision', id: 'decision' },
      { namespace: 'notation', type: 'junction', id: 'junction' },
    ]);
    expect(result.contributions.map(contribution => contribution.roots[0])).toEqual([
      DecisionProvider.key,
      JunctionProvider.key,
    ]);
  });
});

describe('Notation React Connector authoring', () => {
  it('normalizes Core Step children to canonical Connector IR', () => {
    const result = normalizeReactInput(
      createElement(
        Connector,
        { id: 'connector', role: 'flow' },
        createElement(Step, { kind: 'move', to: 'source' }),
        createElement(Step, { kind: 'fold', via: '-|-', to: 'target' }),
      ),
    );

    expect(result.ir.children[0]).toMatchObject({
      namespace: 'notation',
      type: 'connector',
      id: 'connector',
      role: 'flow',
      children: [
        { type: 'step', kind: 'move', to: { id: 'source' } },
        { type: 'step', kind: 'fold', via: '-|-', to: { id: 'target' } },
      ],
    });
    expect(result.contributions[0]).toEqual({ roots: [ConnectorProvider.key], providers: [ConnectorProvider] });
  });

  it('supports Draw way input and rejects mixing it with Step children', () => {
    const result = normalizeReactInput(createElement(Connector, { id: 'draw', way: ['source', 'target'] }));

    expect(result.ir.children[0]).toMatchObject({
      namespace: 'notation',
      type: 'connector',
      children: [
        { type: 'step', kind: 'move', to: { id: 'source' } },
        { type: 'step', kind: 'line', to: { id: 'target' } },
      ],
    });
    expect(() =>
      normalizeReactInput(
        createElement(
          Connector,
          { id: 'mixed', way: ['source', 'target'] },
          createElement(Step, { kind: 'move', to: 'source' }),
          createElement(Step, { to: 'target' }),
        ),
      ),
    ).toThrow(/children|way/i);
  });
});
