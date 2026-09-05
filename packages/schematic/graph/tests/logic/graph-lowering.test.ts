import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

describe('Graph Scope lowering', () => {
  it('lowers to exactly one Scope with complete authored props and ordered composite children', () => {
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      id: 'architecture',
      localNamespace: true,
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
      placement: { target: [30, 40], selfAnchor: 'center' },
      zIndex: 2,
      clip: { kind: 'rect', x: 0, y: 0, width: 200, height: 100 },
      boundingShape: 'circle',
      meta: { owner: 'graph' },
      animations: [],
      graphRules: [{ type: 'entity', style: { opacity: 0.5 } }],
      children: [
        { namespace: 'graph', type: 'entity', id: 'first', role: 'activity', position: [0, 0] },
        { type: 'node', id: 'plain', position: [50, 0] },
      ],
      style: { fill: 'lightblue' },
      defaults: {
        node: {
          style: { dashed: true },
        },
        path: {
          style: { lineCap: 'round' },
        },
        label: { font: { size: 11 } },
        arrow: { length: 12 },
        reset: ['path'],
      },
    });

    expect(Graph.lowerGraph(source, Graph.resolveGraphDefinitionOptions())).toEqual({
      type: 'scope',
      id: 'architecture',
      localNamespace: true,
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
      placement: { target: [30, 40], selfAnchor: 'center' },
      zIndex: 2,
      clip: { kind: 'rect', x: 0, y: 0, width: 200, height: 100 },
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
          style: { opacity: 0.5 },
        },
        { type: 'node', id: 'plain', position: [50, 0] },
      ],
      style: { fill: 'lightblue' },
      defaults: {
        node: {
          style: { dashed: true },
        },
        path: {
          style: { lineCap: 'round' },
        },
        label: { font: { size: 11 } },
        arrow: { length: 12 },
        reset: ['path'],
      },
    });
  });

  it('does not create an id or namespace frame when the author omitted both', () => {
    const lowered = Graph.lowerGraph(
      Graph.GraphSchema.parse({ namespace: 'graph', type: 'graph', children: [] }),
      Graph.resolveGraphDefinitionOptions(),
    );

    expect(lowered).toEqual({ type: 'scope', children: [] });
    expect(lowered).not.toHaveProperty('id');
    expect(lowered).not.toHaveProperty('localNamespace');
  });
});
