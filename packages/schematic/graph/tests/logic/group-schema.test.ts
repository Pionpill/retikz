import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('Group Source schema', () => {
  it('keeps the minimal Source record minimal while accepting arbitrary Core children', () => {
    expect(Graph.createGroup({})).toEqual({ namespace: 'graph', type: 'group' });
    expect(
      Graph.createGroup({
        id: 'system',
        children: [
          { type: 'node', position: [0, 0], text: 'Kernel' },
          { type: 'scope', children: [{ type: 'coordinate', id: 'origin', position: [10, 20] }] },
        ],
      }),
    ).toMatchObject({ namespace: 'graph', type: 'group', id: 'system' });
  });

  it('accepts caption, Surface presentation and the complete Core Node label contract', () => {
    const group = Graph.createGroup({
      caption: {
        side: 'bottom',
        direction: 'vertical',
        itemGap: 2,
        bodyGap: 6,
        title: { text: 'Runtime', font: { weight: 600 } },
        description: { text: 'Execution packages', opacity: 0.6 },
      },
      padding: { x: 12, y: 8 },
      background: { fill: '#fff' },
      border: { stroke: '#111', strokeWidth: 2 },
      cornerRadius: 4,
      overflow: 'visible',
      labels: [
        {
          text: 'public API',
          position: { boundary: 'right', fraction: 0.25 },
          placement: 'outside',
          rotate: 'tangent',
          keepUpright: true,
          pin: true,
        },
      ],
    });

    expect(group.caption?.side).toBe('bottom');
    expect(group.labels?.[0]?.position).toEqual({ boundary: 'right', fraction: 0.25 });
  });

  it('rejects empty captions, invalid gaps and Core-invalid label combinations', () => {
    expect(() => Graph.createGroup({ caption: {} })).toThrow();
    expect(() => Graph.createGroup({ caption: { title: { text: 'A' }, bodyGap: -1 } })).toThrow();
    expect(() => Graph.createGroup({ labels: [{ text: 'inside', placement: 'inside', pin: true }] })).toThrow();
    expect(() => Graph.createGroup({ labels: [] })).toThrow();
  });

  it('does not accept Node identity or geometry fields inside caption text', () => {
    expect(() =>
      Graph.GroupSchema.parse({
        namespace: 'graph',
        type: 'group',
        caption: { title: { text: 'A', position: [0, 0] } },
      }),
    ).toThrow();
  });
});
