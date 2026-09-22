import type { AnyCompositeDefinition, IRChild, LayoutChildResult, LayoutProposal } from '@retikz/core';
import { ChildSchema, CompositeBaseSchema, compileToScene, defineComposite, LayoutChildProbeKind } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { intrinsicLayoutProposal } from '@retikz/layout/compose';
import { describe, expect, it } from 'vitest';
import { literal, boolean } from 'zod';

import { ListDefinition, MapDefinition } from '../../../src';

const cell = (id: string, width: number, height: number) => ({
  id,
  content: {
    type: 'node' as const,
    position: [0, 0] as [number, number],
    style: { fill: 'none', stroke: 'none' },
    layout: { minimumSize: { width, height }, padding: 0, margin: 0 },
  },
});
const compile = (
  child: IRChild,
  proposal: LayoutProposal = intrinsicLayoutProposal('natural'),
  extra: Array<AnyCompositeDefinition> = [],
) => {
  let observed: LayoutChildResult | undefined;
  const harness = defineComposite({
    namespace: 'cell-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: literal('cell-test'),
      type: literal('harness'),
      child: ChildSchema,
    }),
    compile: (node, context) => {
      const probe = context.layoutChild(node.child, proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      observed = probe.result;
      return { children: [context.replay(probe.result)] };
    },
  });
  const scene = compileToScene(
    { type: 'scene', version: 1, children: [{ namespace: 'cell-test', type: 'harness', child }] },
    {
      composites: [harness, ListDefinition, MapDefinition, ...extra],
      clips: [PathClipDefinition],
      padding: 0,
    },
  );
  if (observed === undefined) throw new Error('No layout result');
  return { scene, observed };
};

describe('List / Map allocation', () => {
  it.each(['row', 'column'] as const)('applies per-cell dimensions and auto overrides in a %s List', direction => {
    const source = {
      namespace: 'standard',
      type: 'list',
      layout: { direction, width: 30, height: 20, padding: 0 },
      items: [
        { ...cell('a', 80, 60), layout: { width: 8, height: 10 } },
        { ...cell('b', 40, 10), layout: { width: 'auto' } },
        cell('c', 70, 80),
      ],
    };
    const before = JSON.stringify(source);
    const result = compile(source);
    const bounds = result.scene.spatialHandles.entries
      .filter(entry => entry.role === 'list-cell')
      .map(entry => entry.geometry.bounds);
    expect(bounds).toEqual(
      direction === 'row'
        ? [
            { x: 0, y: 0, width: 8, height: 10 },
            { x: 10, y: 0, width: 40, height: 20 },
            { x: 52, y: 0, width: 30, height: 20 },
          ]
        : [
            { x: 0, y: 0, width: 8, height: 10 },
            { x: 0, y: 12, width: 40, height: 20 },
            { x: 0, y: 34, width: 30, height: 20 },
          ],
    );
    expect(JSON.stringify(source)).toBe(before);
  });
  it('applies Map overall, role and cell dimensions without stretching smaller overrides', () => {
    const result = compile({
      namespace: 'standard',
      type: 'map',
      layout: { width: 30, height: 20, padding: 0, key: { width: 10 }, value: { width: 50, height: 25 } },
      entries: [
        { key: { ...cell('a', 80, 60), layout: { width: 5, height: 7 } }, value: cell('b', 80, 60) },
        { key: cell('c', 80, 60), value: { ...cell('d', 70, 60), layout: { width: 'auto', height: 9 } } },
      ],
    });
    expect(
      result.scene.spatialHandles.entries
        .filter(entry => entry.role === 'map-key' || entry.role === 'map-value')
        .map(entry => entry.geometry.bounds),
    ).toEqual([
      { x: 0, y: 0, width: 5, height: 7 },
      { x: 12, y: 0, width: 50, height: 25 },
      { x: 0, y: 27, width: 10, height: 20 },
      { x: 12, y: 27, width: 70, height: 9 },
    ]);
  });
  it('allocates equal horizontal cells using natural maxima', () => {
    const { observed } = compile({
      namespace: 'standard',
      type: 'list',
      items: [cell('a', 20, 10), cell('b', 30, 20)],
    });
    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 94, height: 36 });
  });
  it('uses separate column maxima and per-row height in Map', () => {
    const { observed } = compile({
      namespace: 'standard',
      type: 'map',
      entries: [
        { key: cell('a', 20, 10), value: cell('b', 30, 20) },
        { key: cell('c', 40, 10), value: cell('d', 10, 10) },
      ],
    });
    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 104, height: 64 });
  });
  it('honors zero padding and gap in vertical List', () => {
    const { observed } = compile({
      namespace: 'standard',
      type: 'list',
      layout: { direction: 'column', gap: 0, padding: 0 },
      items: [cell('a', 20, 10), cell('b', 30, 20)],
    });
    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 30, height: 40 });
  });
  it('does not stretch cells to consume larger parent allocations', () => {
    const { observed } = compile(
      { namespace: 'standard', type: 'list', items: [cell('a', 20, 10)] },
      { x: { kind: 'exact', value: 100 }, y: { kind: 'exact', value: 80 } },
    );
    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 100, height: 80 });
  });
  it('rejects insufficient parent allocation while small fixed cells clip oversized content and padding', () => {
    expect(() =>
      compile(
        { namespace: 'standard', type: 'list', items: [cell('a', 20, 10)] },
        { x: { kind: 'exact', value: 10 }, y: { kind: 'exact', value: 80 } },
      ),
    ).toThrow();
    expect(
      compile({ namespace: 'standard', type: 'list', layout: { width: 1, height: 0 }, items: [cell('a', 20, 10)] })
        .observed.allocationBounds,
    ).toEqual({ x: 0, y: 0, width: 1, height: 0 });
  });
  it('has zero natural allocation for an empty structure', () => {
    for (const child of [
      { namespace: 'standard', type: 'list', items: [] },
      { namespace: 'standard', type: 'map', entries: [] },
    ])
      expect(compile(child).observed.allocationBounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

const custom = defineComposite({
  namespace: 'cell-test',
  type: 'foreign',
  schema: CompositeBaseSchema.extend({
    namespace: literal('cell-test'),
    type: literal('foreign'),
    reject: boolean().default(false),
  }),
  compile: (node, context) => {
    if (node.reject) throw new Error('foreign child rejected content');
    const bounds = { x: -12, y: 6, width: 20, height: 10 };
    return {
      allocationBounds: bounds,
      children: [context.scope({}, [], [{ key: 'content', role: 'foreign', bounds }])],
    };
  },
});
it('centers third-party content with a negative origin and preserves its own spatial handle', () => {
  const result = compile(
    {
      namespace: 'standard',
      type: 'list',
      layout: { width: 60, height: 50 },
      items: [{ id: 'cell', content: { namespace: 'cell-test', type: 'foreign' } }],
    },
    intrinsicLayoutProposal('natural'),
    [custom],
  );
  expect(result.scene.spatialHandles.entries.find(entry => entry.role === 'foreign')?.geometry.bounds).toEqual({
    x: 20,
    y: 20,
    width: 20,
    height: 10,
  });
  expect(result.scene.spatialHandles.entries.find(entry => entry.role === 'list-cell')?.geometry.bounds).toEqual({
    x: 0,
    y: 0,
    width: 60,
    height: 50,
  });
});
it('preserves third-party compilation failures and missing definition errors', () => {
  const source = {
    namespace: 'standard',
    type: 'list',
    items: [{ content: { namespace: 'cell-test', type: 'foreign', reject: true } }],
  };
  expect(() => compile(source, intrinsicLayoutProposal('natural'), [custom])).toThrow(/foreign child rejected/);
  expect(() => compile(source)).toThrow();
});
it('keeps fixed slot geometry under finite range bounds', () => {
  const source = { namespace: 'standard', type: 'list', items: [cell('a', 20, 10)] };
  const result = compile(source, { x: { kind: 'range', min: 100, max: 120 }, y: { kind: 'range', min: 60, max: 80 } });
  expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 100, height: 60 });
  expect(result.scene.spatialHandles.entries.find(entry => entry.role === 'list-cell')?.geometry.bounds).toEqual({
    x: 0,
    y: 0,
    width: 36,
    height: 26,
  });
  expect(() =>
    compile(source, { x: { kind: 'range', min: 0, max: 5 }, y: { kind: 'intrinsic', mode: 'natural' } }),
  ).toThrow();
});

it('measures fixed-cell content naturally without repeated layout compilation', () => {
  let calls = 0;
  const measured = defineComposite({
    namespace: 'cell-test',
    type: 'measured',
    schema: CompositeBaseSchema.extend({ namespace: literal('cell-test'), type: literal('measured') }),
    compile: (_node, context) => {
      calls++;
      expect(context.proposal.x.kind).toBe('intrinsic');
      expect(context.proposal.y.kind).toBe('intrinsic');
      return { allocationBounds: { x: 0, y: 0, width: 80, height: 40 }, children: [] };
    },
  });
  compile(
    {
      namespace: 'standard',
      type: 'list',
      layout: { width: 10, height: 10 },
      items: Array.from({ length: 6 }, () => ({ content: { namespace: 'cell-test', type: 'measured' } })),
    },
    intrinsicLayoutProposal('natural'),
    [measured],
  );
  expect(calls).toBeGreaterThan(0);
  expect(calls).toBeLessThanOrEqual(6);
});

it('keeps label visual overflow outside the parent allocation including indexed lists', () => {
  const source = { namespace: 'standard', type: 'list', showIndex: true, items: [cell('a', 40, 20)] };
  const before = compile(source).observed;
  const after = compile({ ...source, label: { text: 'a very long title outside allocation', distance: 30 } }).observed;
  expect(after.allocationBounds).toEqual(before.allocationBounds);
  expect(after.slotSize).toEqual(before.slotSize);
  expect(after.visualBounds.height).toBeGreaterThan(before.visualBounds.height);
});
