import type { IRNode } from '@retikz/core';

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  createDecision,
  createJunction,
  createStage,
  createTerminal,
  DecisionSchema,
  JunctionSchema,
  StageSchema,
  TerminalSchema,
} from '../../src';

const position = [0, 0] as const;

describe('logic semantic Node sugar', () => {
  it('parses every semantic unit as a Core node with a fixed shape', () => {
    const terminal = TerminalSchema.parse({ type: 'node', id: 'terminal', position });
    const stage = StageSchema.parse({ type: 'node', id: 'stage', position });
    const decision = DecisionSchema.parse({ type: 'node', id: 'decision', position });
    const junction = JunctionSchema.parse({ type: 'node', id: 'junction', position });

    expect(terminal).toMatchObject({
      type: 'node',
      shape: { type: 'rectangle', params: { cornerRadius: 1_000_000 } },
      minimumSize: { width: 48, height: 24 },
      padding: { x: 12, y: 6 },
    });
    expect(stage).toMatchObject({
      type: 'node',
      shape: { type: 'rectangle', params: { cornerRadius: 8 } },
      padding: 8,
    });
    expect(decision).toMatchObject({
      type: 'node',
      shape: { type: 'diamond', params: { aspectRatio: 1.8 } },
      padding: { x: 3, y: 2 },
    });
    expect(junction).toMatchObject({
      type: 'node',
      shape: 'circle',
      minimumSize: { width: 8, height: 8 },
      padding: 0,
      fill: 'currentColor',
    });
  });

  it('rejects an attempt to replace a semantic shape', () => {
    expect(() => StageSchema.parse({ type: 'node', id: 'stage', position, shape: 'circle' })).toThrow();
    expect(() => DecisionSchema.parse({ type: 'node', id: 'decision', position, shape: 'circle' })).toThrow();
  });

  it('accepts Node text fields and preserves them in canonical IR', () => {
    const stage = createStage({ id: 'stage', position, text: 'Process' });
    expect(stage).toMatchObject({ type: 'node', id: 'stage', text: 'Process' });
    expectTypeOf(stage).toEqualTypeOf<IRNode>();
  });

  it('keeps factory output free of composite identity and layout artifacts', () => {
    expect(createTerminal({ id: 'terminal', position })).not.toHaveProperty('namespace');
    expect(createDecision({ id: 'decision', position })).not.toHaveProperty('appearance');
    expect(createJunction({ id: 'junction', position })).toMatchObject({ type: 'node', id: 'junction' });
  });
});
