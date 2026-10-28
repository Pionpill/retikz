import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('Graph Scope 下沉', () => {
  it('下沉到恰好 1 个 Scope，并具有完整编写的 props 和有序的复合子项', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      id: 'architecture',
      localNamespace: true,
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
      position: { kind: 'anchor', target: [30, 40], selfAnchor: 'center' },
      zIndex: 2,
      clip: { kind: 'rect', params: { x: 0, y: 0, width: 200, height: 100 } },
      boundingShape: 'circle',
      meta: { owner: 'graph' },
      animations: [],
      graphRules: [{ type: 'entity', style: { opacity: 0.5 } }],
      children: [
        { namespace: 'graph', type: 'entity', id: 'first', role: 'activity', position: [0, 0] },
        { type: 'node', id: 'plain', position: [50, 0] },
      ],
      defaults: {
        style: { fill: 'lightblue' },
        reset: ['path'],
        node: { style: { dashed: true }, label: { font: { size: 11 } } },
        path: { style: { lineCap: 'round' }, label: { font: { size: 11 } }, arrow: { length: 12 } },
      },
    });

    expect(Graph.lowerGraph(source, Graph.resolveGraphDefinitionOptions())).toEqual({
      type: 'scope',
      id: 'architecture',
      localNamespace: true,
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
      position: { kind: 'anchor', target: [30, 40], selfAnchor: 'center' },
      zIndex: 2,
      clip: { kind: 'rect', params: { x: 0, y: 0, width: 200, height: 100 } },
      boundingShape: 'circle',
      meta: { owner: 'graph' },
      animations: [],
      children: [
        {
          namespace: 'graph',
          type: 'entity',
          id: 'first',
          role: 'activity',
          position: [0, 0],
          style: { opacity: { overall: 0.5 } },
        },
        { type: 'node', id: 'plain', position: [50, 0] },
      ],

      defaults: {
        style: { fill: 'lightblue' },
        reset: ['path'],
        node: { style: { dashed: true }, label: { font: { size: 11 } } },
        path: { style: { lineCap: 'round' }, label: { font: { size: 11 } }, arrow: { length: 12 } },
      },
    });
  });

  it('当作者省略了 id 或命名空间框架时，不会创建两者', () => {
    const lowered = Graph.lowerGraph(
      Graph.GraphSchema.parse({ namespace: 'graph', type: 'graph', children: [] }),
      Graph.resolveGraphDefinitionOptions(),
    );

    expect(lowered).toEqual({ type: 'scope', position: [0, 0], children: [] });
    expect(lowered).not.toHaveProperty('id');
    expect(lowered).not.toHaveProperty('localNamespace');
  });
});
