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
      fill: 'lightblue',
      nodeDefault: { dashed: true },
      pathDefault: { lineCap: 'round' },
      labelDefault: { font: { size: 11 } },
      arrowDefault: { length: 12 },
      resetStyle: ['path'],
      zIndex: 2,
      clip: { kind: 'rect', x: 0, y: 0, width: 200, height: 100 },
      boundingShape: 'circle',
      meta: { owner: 'graph' },
      animations: [],
      graphTheme: { rules: [{ type: 'entity', appearance: { opacity: 0.5 } }] },
      children: [
        { namespace: 'graph', type: 'entity', id: 'first', role: 'activity', position: [0, 0] },
        { type: 'node', id: 'plain', position: [50, 0] },
      ],
    });

    expect(Graph.lowerGraph(source, Graph.resolveGraphDefinitionOptions())).toEqual({
      type: 'scope',
      id: 'architecture',
      localNamespace: true,
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
      placement: { target: [30, 40], selfAnchor: 'center' },
      fill: 'lightblue',
      nodeDefault: { dashed: true },
      pathDefault: { lineCap: 'round' },
      labelDefault: { font: { size: 11 } },
      arrowDefault: { length: 12 },
      resetStyle: ['path'],
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
          opacity: 0.5,
        },
        { type: 'node', id: 'plain', position: [50, 0] },
      ],
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
