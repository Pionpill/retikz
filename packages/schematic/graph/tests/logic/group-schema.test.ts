import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('Group Source 的 schema', () => {
  it('在接受任意 Core 子项的同时，保持最小 Source 记录最小', () => {
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

  it('接受标题、Surface 演示文稿和完整的 Core Node 标签契约', () => {
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

  it('拒绝空标题、无效间隙和 Core 无效标签组合', () => {
    expect(() => Graph.GroupSchema.parse(Graph.createGroup({ caption: {} }))).toThrow();
    expect(() =>
      Graph.GroupSchema.parse(Graph.createGroup({ caption: { title: { text: 'A' }, bodyGap: -1 } })),
    ).toThrow();
    expect(() =>
      Graph.GroupSchema.parse(Graph.createGroup({ labels: [{ text: 'inside', placement: 'inside', pin: true }] })),
    ).toThrow();
    expect(() => Graph.GroupSchema.parse(Graph.createGroup({ labels: [] }))).toThrow();
  });

  it('不接受标题文本内的 Node 标识或几何字段', () => {
    expect(() =>
      Graph.GroupSchema.parse({
        namespace: 'graph',
        type: 'group',
        caption: { title: { text: 'A', position: [0, 0] } },
      }),
    ).toThrow();
  });
});
