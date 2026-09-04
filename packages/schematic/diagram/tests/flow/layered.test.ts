import { describe, expect, it } from 'vitest';

import type {
  EffectiveFlowLayout,
  FlowLayoutElementInput,
  FlowLayoutInput,
  FlowLayoutPlacementOutput,
  FlowLayoutRelationInput,
} from '../../src/flow';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../src/errors';
import { LayeredFlowLayoutDefinition } from '../../src/flow';
import { executeFlowLayout } from '../../src/flow/pipeline';

const layout = (direction: EffectiveFlowLayout['direction'] = 'right'): EffectiveFlowLayout => ({
  direction,
  nodeGap: 20,
  rankGap: 40,
  routing: { kind: 'orthogonal', cornerRadius: 6 },
});

const leaf = (
  id: string,
  rank?: number,
  size: Readonly<{ width: number; height: number }> = { width: 80, height: 40 },
  margin = { top: 0, right: 0, bottom: 0, left: 0 },
): FlowLayoutElementInput => ({ kind: 'leaf', id, ...(rank === undefined ? {} : { rank }), size, margin });

const relation = (
  source: string,
  target: string,
  overrides: Partial<FlowLayoutRelationInput> = {},
): FlowLayoutRelationInput => ({
  source,
  target,
  direction: 'forward',
  routing: { kind: 'orthogonal', cornerRadius: 6 },
  ...overrides,
});

const noLayoutContext = {
  placeLayout: (): FlowLayoutPlacementOutput => {
    throw new Error('Unexpected Layout placement');
  },
};

const run = (input: FlowLayoutInput) => LayeredFlowLayoutDefinition.layout(input, noLayoutContext);

const boundsOf = (output: ReturnType<typeof run>, id: string) => {
  const bounds = output.elements.find(element => element.id === id)?.bounds;
  if (bounds === undefined) throw new Error(`Missing output '${id}'`);
  return bounds;
};

describe('layered Flow layout', () => {
  it('uses stable authored order inside minimal DAG ranks and keeps margin boxes apart', () => {
    const output = run({
      layout: layout(),
      elements: [
        leaf('source', undefined, { width: 60, height: 30 }),
        leaf('first', undefined, { width: 80, height: 40 }, { top: 4, right: 4, bottom: 4, left: 4 }),
        leaf('second', undefined, { width: 70, height: 30 }, { top: 6, right: 2, bottom: 6, left: 2 }),
      ],
      relations: [relation('source', 'first'), relation('source', 'second')],
    });
    const source = boundsOf(output, 'source');
    const first = boundsOf(output, 'first');
    const second = boundsOf(output, 'second');

    expect(source.x + source.width).toBeLessThan(first.x);
    expect(first.x).toBe(second.x + 2);
    expect(first.y + first.height + 4 + 20 + 6).toBeLessThanOrEqual(second.y);
    expect(output.elements.map(element => element.id)).toEqual(['source', 'first', 'second']);
  });

  it('honors explicit rank as a hard constraint and rejects an impossible precedence', () => {
    const ranked = run({
      layout: layout(),
      elements: [leaf('a', 0), leaf('b', 2)],
      relations: [relation('a', 'b')],
    });

    expect(boundsOf(ranked, 'b').x).toBeGreaterThan(boundsOf(ranked, 'a').x);

    try {
      run({
        layout: layout(),
        elements: [leaf('a', 1), leaf('b', 0)],
        relations: [relation('a', 'b')],
      });
      expect.unreachable('Expected an unsatisfiable rank error');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;
      expect(error.code).toBe(RetikzDiagramErrorCode.FlowConstraintUnsatisfiable);
      expect(error.details.relatedIds).toEqual(expect.arrayContaining(['a', 'b']));
    }
  });

  it.each([
    ['right', 'x', 1],
    ['left', 'x', -1],
    ['down', 'y', 1],
    ['up', 'y', -1],
  ] as const)('maps canonical ranks to %s without changing relation order', (direction, axis, sign) => {
    const output = run({
      layout: layout(direction),
      elements: [leaf('a'), leaf('b')],
      relations: [relation('a', 'b')],
    });
    const a = boundsOf(output, 'a');
    const b = boundsOf(output, 'b');

    expect(Math.sign(b[axis] - a[axis])).toBe(sign);
    expect(output.relations).toHaveLength(1);
  });

  it.each(['right', 'left', 'down', 'up'] as const)(
    'preserves non-square measured leaf size when the primary direction is %s',
    direction => {
      const output = executeFlowLayout(
        LayeredFlowLayoutDefinition,
        {
          layout: layout(direction),
          elements: [leaf('measured', undefined, { width: 100.546875, height: 35.2 })],
          relations: [],
        },
        noLayoutContext,
      );

      expect(boundsOf(output, 'measured')).toMatchObject({ width: 100.546875, height: 35.2 });
    },
  );

  it('centers different-height singleton ranks so forward routes stay on one line', () => {
    const output = run({
      layout: layout(),
      elements: [
        leaf('event', undefined, { width: 68, height: 68 }),
        leaf('concept', undefined, { width: 88, height: 44 }),
        leaf('state', undefined, { width: 56, height: 36 }),
      ],
      relations: [relation('event', 'concept'), relation('concept', 'state')],
    });
    const centers = ['event', 'concept', 'state'].map(id => {
      const bounds = boundsOf(output, id);
      return bounds.y + bounds.height / 2;
    });

    expect(centers).toEqual([34, 34, 34]);
    for (const route of output.relations) {
      expect(route.points.every(point => point[1] === 34)).toBe(true);
    }
  });

  it.each(['right', 'left', 'down', 'up'] as const)(
    'keeps forward orthogonal bends between differently sized endpoint bounds when direction is %s',
    direction => {
      const horizontal = direction === 'right' || direction === 'left';
      const output = run({
        layout: layout(direction),
        elements: [
          leaf('source', undefined, { width: 40, height: 40 }),
          leaf('target', undefined, horizontal ? { width: 200, height: 40 } : { width: 40, height: 200 }),
        ],
        relations: [relation('source', 'target')],
      });
      const source = boundsOf(output, 'source');
      const target = boundsOf(output, 'target');
      const bends = output.relations[0]?.points.slice(1, -1) ?? [];
      const gap =
        direction === 'right'
          ? [source.x + source.width, target.x]
          : direction === 'left'
            ? [target.x + target.width, source.x]
            : direction === 'down'
              ? [source.y + source.height, target.y]
              : [target.y + target.height, source.y];
      const axis = horizontal ? 0 : 1;

      expect(bends.length).toBeGreaterThan(0);
      for (const point of bends) {
        expect(point[axis]).toBeGreaterThanOrEqual(gap[0]);
        expect(point[axis]).toBeLessThanOrEqual(gap[1]);
      }
    },
  );

  it.each(['down', 'up'] as const)(
    'maps asymmetric physical margins without overlapping siblings when the primary direction is %s',
    direction => {
      const firstMargin = { top: 2, right: 11, bottom: 5, left: 3 };
      const secondMargin = { top: 13, right: 7, bottom: 17, left: 19 };
      const output = executeFlowLayout(
        LayeredFlowLayoutDefinition,
        {
          layout: layout(direction),
          elements: [
            leaf('first', undefined, { width: 90, height: 30 }, firstMargin),
            leaf('second', undefined, { width: 70, height: 45 }, secondMargin),
          ],
          relations: [],
        },
        noLayoutContext,
      );
      const first = boundsOf(output, 'first');
      const second = boundsOf(output, 'second');

      expect(first.x + first.width + firstMargin.right + 20 + secondMargin.left).toBeLessThanOrEqual(second.x);
    },
  );

  it('routes cycles and parallel relations deterministically and reserves measured labels', () => {
    const input: FlowLayoutInput = {
      layout: layout(),
      elements: [leaf('a'), leaf('b')],
      relations: [relation('a', 'b', { labelSize: { width: 30, height: 12 } }), relation('a', 'b'), relation('b', 'a')],
    };
    const first = run(input);
    const second = run(input);

    expect(first).toEqual(second);
    expect(first.relations).toHaveLength(3);
    expect(first.relations[0]?.points).not.toEqual(first.relations[1]?.points);
    expect(first.relations[0]?.labelBounds).toMatchObject({ width: 30, height: 12 });
    for (const route of first.relations) {
      expect(route.points.length).toBeGreaterThanOrEqual(2);
      route.points.slice(1).forEach((point, index) => {
        const previous = route.points[index];
        expect(point[0] === previous[0] || point[1] === previous[1]).toBe(true);
      });
    }
  });

  it('centers nested Group children when its minimum cross size exceeds the child scope', () => {
    const output = run({
      layout: layout('down'),
      elements: [
        {
          kind: 'group',
          id: 'application',
          minimumSize: { width: 62, height: 76 },
          contentInsets: { top: 20, right: 10, bottom: 10, left: 10 },
          layout: layout('down'),
          elements: [leaf('api', undefined, { width: 40, height: 30 })],
        },
        leaf('database', undefined, { width: 90, height: 30 }),
      ],
      relations: [relation('api', 'database')],
    });
    const api = boundsOf(output, 'api');
    const database = boundsOf(output, 'database');

    expect(api.x + api.width / 2).toBe(45);
    expect(database.x + database.width / 2).toBe(45);
    expect(output.relations[0]?.points.every(point => point[0] === 45)).toBe(true);
  });

  it('lays out recursive Groups before their parent and keeps cross-Group endpoints in one root coordinate system', () => {
    const output = run({
      layout: layout(),
      elements: [
        {
          kind: 'group',
          id: 'group',
          minimumSize: { width: 120, height: 80 },
          contentInsets: { top: 20, right: 10, bottom: 10, left: 10 },
          layout: layout('down'),
          elements: [leaf('a'), leaf('b')],
        },
        leaf('outside'),
      ],
      relations: [relation('a', 'b'), relation('group', 'outside'), relation('a', 'outside')],
    });
    const group = boundsOf(output, 'group');
    const a = boundsOf(output, 'a');
    const b = boundsOf(output, 'b');

    expect(output.elements.map(element => element.id)).toEqual(['group', 'a', 'b', 'outside']);
    expect(group.width).toBeGreaterThanOrEqual(120);
    expect(group.height).toBeGreaterThanOrEqual(80);
    for (const child of [a, b]) {
      expect(child.x).toBeGreaterThanOrEqual(group.x + 10);
      expect(child.y).toBeGreaterThanOrEqual(group.y + 20);
      expect(child.x + child.width).toBeLessThanOrEqual(group.x + group.width - 10);
      expect(child.y + child.height).toBeLessThanOrEqual(group.y + group.height - 10);
    }
    expect(output.relations).toHaveLength(3);
  });

  it('delegates authored Layout placement once and does not derive its child order from relations', () => {
    let calls = 0;
    const output = LayeredFlowLayoutDefinition.layout(
      {
        layout: layout(),
        elements: [
          {
            kind: 'layout',
            id: 'lane',
            layout: { ...layout('down'), nodeGap: 10 },
            align: 'end',
            elements: [
              leaf('first', undefined, { width: 40, height: 20 }),
              leaf('second', undefined, { width: 60, height: 30 }),
            ],
          },
        ],
        relations: [relation('second', 'first')],
      },
      {
        placeLayout: input => {
          calls += 1;
          expect(input.layout).toEqual({ id: 'lane', direction: 'down', gap: 10, align: 'end' });
          expect(input.elements.map(element => element.id)).toEqual(['first', 'second']);
          return {
            bounds: { x: 0, y: 0, width: 60, height: 60 },
            elements: [
              { id: 'first', bounds: { x: 20, y: 0, width: 40, height: 20 } },
              { id: 'second', bounds: { x: 0, y: 30, width: 60, height: 30 } },
            ],
          };
        },
      },
    );

    expect(calls).toBe(1);
    expect(boundsOf(output, 'lane')).toEqual({ x: 0, y: 0, width: 60, height: 60 });
    expect(boundsOf(output, 'first')).toEqual({ x: 20, y: 0, width: 40, height: 20 });
    expect(boundsOf(output, 'second')).toEqual({ x: 0, y: 30, width: 60, height: 30 });
  });
});
