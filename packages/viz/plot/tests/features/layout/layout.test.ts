import type { IRChild, IRNode, IRScope, ScenePrimitive } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { PlotSpec } from '../../../src/schemas';

import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSpecSchema } from '../../../src/schemas';

const rows = [
  { x: 0, y: 2 },
  { x: 10, y: 8 },
];

const baseSpec = (extra: Record<string, unknown> = {}): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    id: 'p',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x', domainPadding: 0 },
      { type: 'linear', name: 'y', domainPadding: 0 },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y' },
    ],
    ...extra,
  });

const expandOf = (spec: PlotSpec): IRScope => {
  const [definition] = lowerPlots({ d: rows }, { width: 480, height: 300 });
  return definition.expand(spec) as IRScope;
};

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';
const isNode = (child: IRChild): child is IRNode => child.type === 'node';

const allNodes = (root: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (scope: IRScope): void => {
    for (const child of scope.children) {
      if (isNode(child)) out.push(child);
      if (isScope(child)) walk(child);
    }
  };
  walk(root);
  return out;
};

const flattenPrimitives = (primitives: Array<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flattenPrimitives(primitive.children)] : [primitive],
  );

const plotAreaCarrierOf = (root: IRScope): IRNode => {
  const found = root.children.find((child): child is IRNode => isNode(child) && child.id === 'p.plotArea');
  if (found === undefined) throw new Error('Expected p.plotArea carrier');
  return found;
};

const nodeHeight = (node: IRNode): number => {
  const size = node.minimumSize;
  if (typeof size === 'number') return size;
  return size?.height ?? size?.default ?? 0;
};

describe('plot label layout', () => {
  it('plot_title_reserves_top_band_and_lowers_text_node', () => {
    const plain = expandOf(baseSpec());
    const decorated = expandOf(
      baseSpec({
        labels: [
          {
            type: 'text',
            role: 'title',
            text: 'Monthly Revenue',
            placement: { kind: 'side', side: 'top', placement: 'midway', padding: 8 },
            font: { size: 18 },
          },
        ],
      }),
    );

    const plainCarrier = plotAreaCarrierOf(plain);
    const decoratedCarrier = plotAreaCarrierOf(decorated);
    expect((decoratedCarrier.position as [number, number])[1]).toBeGreaterThan((plainCarrier.position as [number, number])[1]);
    expect(nodeHeight(decoratedCarrier)).toBeLessThan(nodeHeight(plainCarrier));
    expect(allNodes(decorated).some(node => node.text === 'Monthly Revenue')).toBe(true);
  });

  it('plot_title_styled_text_block_compiles_to_multi_line_scene_text', () => {
    const spec = baseSpec({
      labels: [
        {
          type: 'text',
          role: 'title',
          text: ['Quarterly Conversion Rate', { text: 'Internal funnel data', opacity: 0.62, font: { size: 12, weight: 500 } }],
          placement: { kind: 'side', side: 'top', placement: 'midway', padding: 10 },
          font: { size: 18, weight: 700 },
        },
      ],
    });
    const scene = compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites: lowerPlots({ d: rows }, { width: 420, height: 260 }) });
    const title = flattenPrimitives(scene.primitives).find(
      primitive =>
        primitive.type === 'text' &&
        primitive.lines.some(line => line.text === 'Quarterly Conversion Rate') &&
        primitive.lines.some(line => line.text === 'Internal funnel data'),
    );
    expect(title).toMatchObject({
      type: 'text',
      lines: [
        { text: 'Quarterly Conversion Rate' },
        { text: 'Internal funnel data', opacity: 0.62, fontSize: 12, fontWeight: 500 },
      ],
    });
  });

  it('point_decoration_does_not_reserve_space', () => {
    const plain = expandOf(baseSpec());
    const decorated = expandOf(
      baseSpec({
        labels: [
          {
            type: 'text',
            role: 'note',
            text: 'Preliminary',
            placement: { kind: 'point', target: 'plotArea', x: 0.98, y: 0.02, anchor: 'end' },
          },
        ],
      }),
    );

    expect(plotAreaCarrierOf(decorated)).toEqual(plotAreaCarrierOf(plain));
    expect(allNodes(decorated).some(node => node.text === 'Preliminary')).toBe(true);
  });

  it('fixed_layout_keeps_plot_area_from_auto_reserve', () => {
    const plain = expandOf(baseSpec());
    const decorated = expandOf(
      baseSpec({
        layout: { mode: 'fixed' },
        labels: [
          {
            type: 'text',
            role: 'title',
            text: 'Monthly Revenue',
            placement: { kind: 'side', side: 'top', placement: 'midway', padding: 8 },
          },
        ],
      }),
    );

    expect(plotAreaCarrierOf(decorated)).toEqual(plotAreaCarrierOf(plain));
    expect(allNodes(decorated).some(node => node.text === 'Monthly Revenue')).toBe(true);
  });
});
