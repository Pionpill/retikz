import { describe, expect, it } from 'vitest';

import { decision, junction, stage, terminal } from '../src';

describe('Standard Vanilla semantic Node sugar', () => {
  it('returns canonical Core Nodes directly', () => {
    expect(terminal('start', { position: [0, 0], text: 'Start' })).toMatchObject({
      type: 'node',
      id: 'start',
      text: 'Start',
      shape: { type: 'rectangle', params: { cornerRadius: 1_000_000 } },
    });
    expect(stage('step', { position: [20, 0] })).toMatchObject({
      type: 'node',
      id: 'step',
      shape: { type: 'rectangle', params: { cornerRadius: 8 } },
    });
    expect(decision('check', { position: [40, 0] })).toMatchObject({
      type: 'node',
      id: 'check',
      shape: { type: 'diamond', params: { aspectRatio: 1.8 } },
    });
    expect(junction('join', { position: [60, 0] })).toMatchObject({ type: 'node', id: 'join', shape: 'circle' });
  });

  it('does not derive semantic ids or composite definitions', () => {
    const node = terminal('start', { position: [0, 0] });
    expect(node.id).toBe('start');
    expect(node).not.toHaveProperty('namespace');
  });
});
