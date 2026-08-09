import { buildIRWithContributions, Text } from '@retikz/react';
import { createElement, Fragment } from 'react';
import { describe, expect, it } from 'vitest';

import { Decision, Junction, Stage, Terminal } from '../../src';

describe('Notation React semantic Node sugar', () => {
  it('lowers direct text children to a Core Node without composite definitions', () => {
    const result = buildIRWithContributions(createElement(Stage, { id: 'stage', position: [0, 0] }, 'Process'));
    expect(result.ir.children).toHaveLength(1);
    expect(result.ir.children[0]).toMatchObject({
      type: 'node',
      id: 'stage',
      text: 'Process',
      shape: { type: 'rectangle', params: { cornerRadius: 8 } },
    });
    expect(result.contributions[0]?.makeComposites({})).toEqual([]);
  });

  it('supports the same Text child syntax as Core Node', () => {
    const result = buildIRWithContributions(
      createElement(Terminal, { id: 'terminal', position: [0, 0] }, createElement(Text, { children: 'Start' })),
    );
    expect(result.ir.children[0]).toMatchObject({
      type: 'node',
      id: 'terminal',
      text: 'Start',
      shape: { type: 'rectangle', params: { cornerRadius: 1_000_000 } },
    });
  });

  it('keeps each semantic component on its own fixed shape', () => {
    const result = buildIRWithContributions(
      createElement(
        Fragment,
        null,
        createElement(Decision, { id: 'decision', position: [0, 0] }),
        createElement(Junction, { id: 'junction', position: [20, 0] }),
      ),
    );
    expect(result.ir.children).toEqual([
      expect.objectContaining({ type: 'node', shape: { type: 'diamond', params: { aspectRatio: 1.8 } } }),
      expect.objectContaining({ type: 'node', shape: 'circle' }),
    ]);
  });
});
