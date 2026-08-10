import { buildIRWithContributions, Step, Text } from '@retikz/react';
import { createElement, Fragment } from 'react';
import { describe, expect, it } from 'vitest';

import { Connector, Decision, Junction, Stage, Terminal } from '../../src';

describe('@retikz/notation-react package boundary', () => {
  it('does not expose Callout authoring', async () => {
    const notationReact = await import('../../src');

    expect(notationReact).not.toHaveProperty('Callout');
  });
});

describe('Notation React semantic unit authoring', () => {
  it('keeps semantic IR while supporting the same text children as Core Node', () => {
    const stage = buildIRWithContributions(createElement(Stage, { id: 'stage', position: [0, 0] }, 'Process'));
    const terminal = buildIRWithContributions(
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
    expect(stage.contributions[0]?.makeComposites({})).toEqual([expect.objectContaining({ type: 'stage' })]);
    expect(terminal.contributions[0]?.makeComposites({})).toEqual([expect.objectContaining({ type: 'terminal' })]);
  });

  it('contributes the matching Definition for every semantic unit', () => {
    const result = buildIRWithContributions(
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
    expect(result.contributions.flatMap(contribution => contribution.makeComposites({}))).toMatchObject([
      { namespace: 'notation', type: 'decision' },
      { namespace: 'notation', type: 'junction' },
    ]);
  });
});

describe('Notation React Connector authoring', () => {
  it('normalizes Core Step children to canonical Connector IR', () => {
    const result = buildIRWithContributions(
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
    expect(result.contributions[0]?.makeComposites({})).toEqual([
      expect.objectContaining({ namespace: 'notation', type: 'connector' }),
    ]);
  });

  it('supports Draw way input and rejects mixing it with Step children', () => {
    const result = buildIRWithContributions(createElement(Connector, { id: 'draw', way: ['source', 'target'] }));

    expect(result.ir.children[0]).toMatchObject({
      namespace: 'notation',
      type: 'connector',
      children: [
        { type: 'step', kind: 'move', to: { id: 'source' } },
        { type: 'step', kind: 'line', to: { id: 'target' } },
      ],
    });
    expect(() =>
      buildIRWithContributions(
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
