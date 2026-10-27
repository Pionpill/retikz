import { ChildSchema, compileToScene, CompositeBaseSchema, defineComposite } from '@retikz/core';
import type { CompositeEvaluationResult, IRChild, LayoutProposal } from '@retikz/core';
import { expect, it } from 'vitest';
import { literal } from 'zod';

import {
  createFlexLayout,
  createGridLayout,
  createOverlayLayout,
  flexLayoutDefinition,
  gridLayoutDefinition,
  overlayLayoutDefinition,
} from '../../src';

it('匹配内容、固定和约束布局下请求的轴的完整布局槽', () => {
  const leaf: IRChild = { type: 'node', position: [0, 0], text: 'alpha beta gamma delta', layout: { padding: 0 } };
  const proposals: Array<LayoutProposal> = [
    { x: { kind: 'intrinsic', mode: 'minimum' }, y: { kind: 'intrinsic', mode: 'natural' } },
    { x: { kind: 'intrinsic', mode: 'natural' }, y: { kind: 'intrinsic', mode: 'minimum' } },
    { x: { kind: 'range', min: 10, max: 60 }, y: { kind: 'range', min: 5, max: 80 } },
    { x: { kind: 'exact', value: 55 }, y: { kind: 'exact', value: 35 } },
  ];
  const custom = defineComposite({
    namespace: 'measure-spec',
    type: 'custom',
    schema: CompositeBaseSchema.extend({ namespace: literal('measure-spec'), type: literal('custom') }),
    compile: (_node, context): CompositeEvaluationResult => {
      if (context.evaluation.kind === 'contribution') {
        const axis = context.evaluation.axis;
        return {
          kind: 'contribution',
          contribution:
            axis === 'x' ? { axis, width: 90 } : axis === 'y' ? { axis, height: 25 } : { axis, width: 90, height: 25 },
        };
      }
      return {
        children: [],
        allocationBounds: { x: 0, y: 0, width: 90, height: 25 },
        alignmentGuides: [{ name: 'first-baseline', dimension: 'y', position: 18 }],
      };
    },
  });
  let checked = 0;
  for (const fixed of [false, true]) {
    const size = fixed
      ? { size: { x: { kind: 'fixed' as const, value: 120 }, y: { kind: 'fixed' as const, value: 40 } } }
      : {};
    const children = [
      createFlexLayout({ ...size, children: [{ kind: 'flex', key: 'text', child: leaf }] }),
      createGridLayout({
        ...size,
        columns: [{ kind: 'content', mode: 'natural' }],
        rows: [{ kind: 'content', mode: 'natural' }],
        children: [{ kind: 'grid', key: 'text', child: leaf }],
      }),
      createOverlayLayout({ ...size, children: [{ kind: 'overlay', key: 'text', child: leaf }] }),
    ];
    children.push(
      createFlexLayout({
        ...size,
        alignItems: 'first-baseline',
        children: [
          { kind: 'flex', key: 'a', child: leaf },
          {
            kind: 'flex',
            key: 'b',
            child: { type: 'node', position: [0, 0], text: 'tall', style: { font: { size: 32 } } },
          },
        ],
      }),
      createGridLayout({
        ...size,
        alignItems: 'first-baseline',
        columns: [
          { kind: 'fixed', value: 20 },
          { kind: 'content', mode: 'natural' },
        ],
        rows: [{ kind: 'content', mode: 'natural' }],
        overflow: 'clip',
        children: [
          { kind: 'grid', key: 'a', child: leaf, column: { start: 0 } },
          {
            kind: 'grid',
            key: 'b',
            child: { type: 'node', position: [0, 0], text: 'tall', style: { font: { size: 32 } } },
            column: { start: 1 },
          },
        ],
      }),
      createOverlayLayout({
        ...size,
        children: [
          { kind: 'overlay', key: 'a', child: leaf },
          {
            kind: 'overlay',
            key: 'b',
            child: leaf,
            sizeParticipation: 'exclude',
            placement: { kind: 'positioned', at: { x: 70, y: 80 }, width: 25 },
          },
        ],
      }),
    );
    const customChild = { namespace: 'measure-spec', type: 'custom' };
    children.push(
      createFlexLayout({ ...size, children: [{ kind: 'flex', child: customChild }] }),
      createGridLayout({
        ...size,
        columns: [{ kind: 'fixed', value: 15 }],
        rows: [{ kind: 'fixed', value: 10 }],
        children: [{ kind: 'grid', child: customChild }],
      }),
      createOverlayLayout({ ...size, children: [{ kind: 'overlay', child: customChild }] }),
    );
    for (const child of children)
      for (const proposal of proposals) {
        const host = defineComposite({
          namespace: 'measure-spec',
          type: 'host',
          schema: CompositeBaseSchema.extend({
            namespace: literal('measure-spec'),
            type: literal('host'),
            child: ChildSchema,
          }),
          compile: (_node, context) => {
            const bound = context.selectSourceChild(['child']);
            const full = context.layoutChild(bound, proposal);
            if (full.kind === 'failed') return context.raise(full.failure);
            for (const axis of ['x', 'y', 'both'] as const) {
              const measurement = context.measureChild(bound, proposal, axis);
              if (measurement.kind === 'failed') return context.raise(measurement.failure);
              const result = measurement.result;
              if (result.axis !== 'y') expect(result.width).toBe(full.result.slotSize.width);
              if (result.axis !== 'x') expect(result.height).toBe(full.result.slotSize.height);
              checked++;
            }
            return { children: [context.replay(full.result)] };
          },
        });
        compileToScene(
          { version: 1, type: 'scene', children: [{ namespace: 'measure-spec', type: 'host', child }] },
          {
            composites: [host, custom, flexLayoutDefinition, gridLayoutDefinition, overlayLayoutDefinition],
            measureText: (text, font) => ({ width: (text.length * font.size) / 2, height: font.size }),
          },
        );
      }
  }
  expect(checked).toBe(216);
});
