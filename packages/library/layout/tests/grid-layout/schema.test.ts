import type { IRChild } from '@retikz/core';
import { ChildSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type {
  GridLayoutInput,
  GridLayoutItemInput,
  GridPlacementInput,
  GridTrackBreadthInput,
  GridTrackInput,
} from '../../src';
import {
  createGridLayout,
  GRID_LAYOUT_MAX_TRACKS_PER_AXIS,
  GridAutoFlow,
  GridLayoutSchema,
  GridOverlap,
  LayoutAlignment,
  LayoutDistribution,
  LayoutItemKind,
} from '../../src';
import { resolveGridLayout } from '../../src/resolve/grid-layout';

const child: IRChild = { type: 'node', position: [0, 0], text: 'Revenue' };

/** 外部 payload 的唯一 schema 入口 */
const parseGridLayout = (input: Record<string, unknown>) =>
  GridLayoutSchema.parse({ namespace: 'layout', type: 'gridLayout', ...input });

describe('GridLayout schema and factory', () => {
  it('creates canonical JSON IR from author input defaults', () => {
    const item = { kind: LayoutItemKind.Grid, key: 'label', child } satisfies GridLayoutItemInput;
    const input = { columns: [{ kind: 'fixed', value: 20 }], children: [item] } satisfies GridLayoutInput;
    const source = createGridLayout(input);
    expect(source).toEqual({ namespace: 'layout', type: 'gridLayout', ...input });
    expect(parseGridLayout(input)).toMatchObject({ rowGap: 0, rows: [], overlap: 'reject' });
    expect(resolveGridLayout(parseGridLayout(input))).toEqual(resolveGridLayout(source));
    const parsed = resolveGridLayout(source);

    expect(parsed).toEqual({
      namespace: 'layout',
      type: 'gridLayout',
      size: { x: { kind: 'content' }, y: { kind: 'content' } },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      overflow: 'visible',
      columns: [{ kind: 'fixed', value: 20 }],
      rows: [],
      implicitColumn: { kind: 'content', mode: 'natural' },
      implicitRow: { kind: 'content', mode: 'natural' },
      autoFlow: 'row',
      overlap: 'reject',
      columnGap: 0,
      rowGap: 0,
      justifyItems: 'stretch',
      alignItems: 'stretch',
      justifyContent: 'start',
      alignContent: 'start',
      children: [
        {
          kind: 'grid',
          key: 'label',
          child,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          column: { span: 1 },
          row: { span: 1 },
        },
      ],
    });
    expect(ChildSchema.safeParse(parsed.children[0]?.child).success).toBe(true);
  });

  it('keeps track, placement and item inputs aligned with parsed schema outputs', () => {
    const breadth = { kind: 'content', mode: 'minimum' } satisfies GridTrackBreadthInput;
    const track = { kind: 'minmax', min: breadth, max: { kind: 'fraction', factor: 2 } } satisfies GridTrackInput;
    const placement = { start: 0 } satisfies GridPlacementInput;
    expect(
      parseGridLayout({ columns: [track], children: [{ kind: 'grid', key: 'a', child, column: placement }] }),
    ).toMatchObject({ columns: [track], children: [{ column: { start: 0 } }] });
  });

  it('accepts a span without a start as an auto-placement axis', () => {
    const autoSpan = { span: 2 } satisfies GridPlacementInput;

    expect(
      parseGridLayout({
        columns: [{ kind: 'fixed', value: 20 }],
        children: [{ kind: 'grid', key: 'span', child, column: autoSpan }],
      }).children[0]?.column,
    ).toEqual({ span: 2 });
  });

  it('keeps an omitted item key out of Source IR', () => {
    const parsed = parseGridLayout({
      columns: [{ kind: 'fixed', value: 20 }],
      children: [{ kind: LayoutItemKind.Grid, child }],
    });

    expect(parsed.children[0]).not.toHaveProperty('key');
  });

  it('rejects an auto span above the track guard at the authored span path', () => {
    const result = GridLayoutSchema.safeParse({
      namespace: 'layout',
      type: 'gridLayout',
      columns: [{ kind: 'fixed', value: 20 }],
      children: [
        {
          kind: 'grid',
          key: 'guard',
          child,
          column: { span: GRID_LAYOUT_MAX_TRACKS_PER_AXIS + 1 },
        },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected GridLayout auto span to fail schema validation');
    expect(result.error.issues.some(issue => issue.path.join('.') === 'children.0.column.span')).toBe(true);
  });

  it('rejects invalid tracks, placement, duplicate keys and every nested unknown field', () => {
    const base = { columns: [{ kind: 'fixed', value: 20 }], children: [] } satisfies GridLayoutInput;
    const invalid = [
      { kind: 'fraction', factor: 0 },
      { kind: 'fraction', factor: -1 },
      { kind: 'minmax', min: { kind: 'fraction', factor: 1 }, max: { kind: 'fixed', value: 2 } },
      { kind: 'minmax', min: { kind: 'fixed', value: 3 }, max: { kind: 'fixed', value: 2 } },
    ];

    for (const track of invalid) expect(() => parseGridLayout({ ...base, columns: [track] })).toThrow();
    expect(() => parseGridLayout({ ...base, columns: [{ kind: 'fixed', value: 1, extra: true }] })).toThrow();
    expect(() =>
      parseGridLayout({
        ...base,
        children: [{ kind: 'grid', key: 'a', child, column: { start: -1 } }],
      }),
    ).toThrow();
    expect(() =>
      parseGridLayout({
        ...base,
        children: [{ kind: 'grid', key: 'a', child, row: { start: 0, span: 0 } }],
      }),
    ).toThrow();
    expect(() =>
      parseGridLayout({
        ...base,
        children: [
          { kind: 'grid', key: 'same', child },
          { kind: 'grid', key: 'same', child },
        ],
      }),
    ).toThrow(/duplicate/i);
    expect(() => parseGridLayout({ ...base, children: [{ kind: 'flex', key: 'a', child }] })).toThrow();
    expect(() => GridLayoutSchema.parse({ namespace: 'layout', type: 'gridLayout', ...base, unknown: true })).toThrow();
  });

  it('keeps alignment subsets, flow values and the public track guard exact', () => {
    expect(GRID_LAYOUT_MAX_TRACKS_PER_AXIS).toBe(10_000);
    expect(Object.values(GridAutoFlow)).toEqual(['row', 'column']);
    expect(Object.values(GridOverlap)).toEqual(['reject', 'allow']);
    expect(
      parseGridLayout({
        columns: [{ kind: 'content', mode: 'natural' }],
        autoFlow: GridAutoFlow.Column,
        overlap: GridOverlap.Allow,
        alignItems: LayoutAlignment.FirstBaseline,
        justifyContent: LayoutDistribution.SpaceEvenly,
        children: [],
      }),
    ).toMatchObject({ autoFlow: 'column', overlap: 'allow', alignItems: 'first-baseline' });
    expect(() =>
      parseGridLayout({
        columns: [{ kind: 'fixed', value: 1 }],
        children: [{ kind: 'grid', key: 'a', child, justifySelf: LayoutAlignment.FirstBaseline }],
      }),
    ).toThrow();
    expect(() =>
      parseGridLayout({
        columns: Array.from({ length: GRID_LAYOUT_MAX_TRACKS_PER_AXIS + 1 }, () => ({ kind: 'fixed', value: 1 })),
      }),
    ).toThrow();
  });
});
