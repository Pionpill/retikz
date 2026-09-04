import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import type { GroupPrim, PathPrim, ScenePrimitive, TextMeasurer, TextPrim } from '../../src';
import type { IRPath, IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { definePathGenerator } from '../../src/contract';
import { flattenPrims } from '../helpers/flatten';

const STROKE = '#13579b';

const measuredLabel: TextMeasurer = () => ({ width: 20, height: 10 });

type CoreCompileOptions = NonNullable<Parameters<typeof compileToScene>[1]>;

const compile = (ir: IRScene, options: CoreCompileOptions = {}) =>
  compileToScene(ir, { ...options, measureText: measuredLabel }).scene;

const horizontalHostLabelPath = (label: IRPath['label']): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      id: 'edge',
      stroke: STROKE,
      label,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    },
  ],
});

const strokeFragments = (primitives: ReadonlyArray<ScenePrimitive>): Array<PathPrim> =>
  flattenPrims(primitives).filter(
    (primitive): primitive is PathPrim => primitive.type === 'path' && primitive.stroke === STROKE,
  );

const textPrim = (primitives: ReadonlyArray<ScenePrimitive>, text: string): TextPrim => {
  const primitive = flattenPrims(primitives).find(
    (candidate): candidate is TextPrim => candidate.type === 'text' && candidate.lines.some(line => line.text === text),
  );
  if (primitive === undefined) throw new Error(`missing text primitive '${text}'`);
  return primitive;
};

const firstMove = (path: PathPrim): [number, number] => {
  const command = path.commands.find(candidate => candidate.kind === 'move');
  if (command === undefined) throw new Error('missing move command');
  return command.to;
};

const lastLine = (path: PathPrim): [number, number] => {
  const command = [...path.commands].reverse().find(candidate => candidate.kind === 'line');
  if (command === undefined) throw new Error('missing line command');
  return command.to;
};

const rotationCenter = (primitives: ReadonlyArray<ScenePrimitive>, text: string): [number, number] => {
  const group = flattenPrims(primitives).find(
    (candidate): candidate is GroupPrim =>
      candidate.type === 'group' &&
      candidate.children.some(
        (child): child is TextPrim => child.type === 'text' && child.lines.some(line => line.text === text),
      ),
  );
  const transform = group?.transforms?.find(candidate => candidate.kind === 'rotate');
  if (transform === undefined || transform.cx === undefined || transform.cy === undefined) {
    throw new Error(`missing rotation group for '${text}'`);
  }
  return [transform.cx, transform.cy];
};

const coversX = (paths: ReadonlyArray<PathPrim>, x: number): boolean =>
  paths.some(path => {
    const from = firstMove(path);
    const to = lastLine(path);
    return from[1] === 0 && to[1] === 0 && Math.min(from[0], to[0]) <= x && x <= Math.max(from[0], to[0]);
  });

describe('Stroke Path label interruption', () => {
  it('splits an unfilled centered host label around its measured visual box', () => {
    const scene = compile(horizontalHostLabelPath({ text: 'host', sloped: true }));
    const fragments = strokeFragments(scene.primitives).sort((left, right) => firstMove(left)[0] - firstMove(right)[0]);

    expect(fragments).toHaveLength(2);
    expect(lastLine(fragments[0])[0]).toBeLessThanOrEqual(40);
    expect(firstMove(fragments[1])[0]).toBeGreaterThanOrEqual(60);
    expect(textPrim(scene.primitives, 'host').x).toBe(50);
    expect(flattenPrims(scene.primitives).some(primitive => 'id' in primitive && primitive.id === 'edge')).toBe(true);
  });

  it('keeps fragments under one logical path owner with id, meta, and animations', () => {
    const animation = {
      property: 'opacity' as const,
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
      duration: 200,
    };
    const scene = compile({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          id: 'logical-edge',
          meta: { source: 'interruption' },
          animations: [animation],
          stroke: STROKE,
          label: { text: 'owner', sloped: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    });
    const owner = scene.primitives.find(
      (primitive): primitive is GroupPrim => primitive.type === 'group' && primitive.id === 'logical-edge',
    );
    const fragments = strokeFragments(owner?.children ?? []);

    expect(owner?.meta).toEqual({ source: 'interruption' });
    expect(owner?.animations).toEqual([animation]);
    expect(fragments).toHaveLength(2);
    for (const fragment of fragments) {
      expect(fragment.id).toBeUndefined();
      expect(fragment.meta).toBeUndefined();
      expect(fragment.animations).toBeUndefined();
    }
  });

  it('keeps above labels and explicit false overrides as one continuous stroke', () => {
    const above = compile(horizontalHostLabelPath({ text: 'above', side: 'top' }));
    const disabled = compile(horizontalHostLabelPath({ text: 'disabled', sloped: true, interrupt: false }));

    expect(strokeFragments(above.primitives)).toHaveLength(1);
    expect(strokeFragments(disabled.primitives)).toHaveLength(1);
  });

  it('applies the same interruption behavior to host and step labels', () => {
    const host = compile(horizontalHostLabelPath({ text: 'host', sloped: true }));
    const step = compile({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          stroke: STROKE,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0], label: { text: 'step', sloped: true } },
          ],
        },
      ],
    });

    expect(strokeFragments(host.primitives)).toHaveLength(2);
    expect(strokeFragments(step.primitives)).toHaveLength(2);
  });

  it('merges overlapping label gaps instead of creating an intermediate fragment', () => {
    const scene = compile(
      horizontalHostLabelPath([
        { text: 'first', position: 0.45, sloped: true },
        { text: 'second', position: 0.55, sloped: true },
      ]),
    );

    expect(strokeFragments(scene.primitives)).toHaveLength(2);
  });

  it('clamps an endpoint label gap without retaining visible stroke through its text box', () => {
    const scene = compile(horizontalHostLabelPath({ text: 'start', position: 0, sloped: true }));
    const fragments = strokeFragments(scene.primitives);

    expect(fragments).toHaveLength(1);
    expect(firstMove(fragments[0])[0]).toBeGreaterThanOrEqual(10);
  });

  it('omits a short stroke when its centered label interruption covers the complete logical segment', () => {
    const scene = compile({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          stroke: STROKE,
          label: { text: 'wide label', sloped: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    });

    expect(strokeFragments(scene.primitives)).toHaveLength(0);
  });

  it.each([
    {
      name: 'quadratic',
      commandKind: 'quad',
      ir: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            stroke: STROKE,
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'curve', control: [50, -80], to: [100, 0], label: { text: 'q', sloped: true } },
            ],
          },
        ],
      } satisfies IRScene,
    },
    {
      name: 'cubic',
      commandKind: 'cubic',
      ir: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            stroke: STROKE,
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              {
                type: 'step',
                kind: 'cubic',
                control1: [0, -80],
                control2: [100, -80],
                to: [100, 0],
                label: { text: 'c', sloped: true },
              },
            ],
          },
        ],
      } satisfies IRScene,
    },
    {
      name: 'arc',
      commandKind: 'arc',
      ir: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            stroke: STROKE,
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              {
                type: 'step',
                kind: 'arc',
                startAngle: 0,
                endAngle: 180,
                radius: 50,
                label: { text: 'a', sloped: true },
              },
            ],
          },
        ],
      } satisfies IRScene,
    },
    {
      name: 'ellipse arc',
      commandKind: 'ellipseArc',
      ir: {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            stroke: STROKE,
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              {
                type: 'step',
                kind: 'ellipsePath',
                radius: { x: 60, y: 30 },
                label: { text: 'e', sloped: true },
              },
            ],
          },
        ],
      } satisfies IRScene,
    },
  ])('$name keeps its command form in both visible fragments', ({ commandKind, ir }) => {
    const fragments = strokeFragments(compile(ir).primitives);

    expect(fragments).toHaveLength(2);
    expect(fragments.every(fragment => fragment.commands.some(command => command.kind === commandKind))).toBe(true);
  });

  it('expands a fragmented closing edge to lines instead of leaving a close command that redraws the gap', () => {
    const scene = compile({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          stroke: STROKE,
          label: { text: 'close', position: 0.9, sloped: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
            { type: 'step', kind: 'line', to: [100, 100] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    });
    const fragments = strokeFragments(scene.primitives);

    expect(fragments).toHaveLength(2);
    expect(fragments.flatMap(fragment => fragment.commands).some(command => command.kind === 'close')).toBe(false);
  });

  it('keeps duplicate line occurrences separate when each step owns a different gap', () => {
    const scene = compile({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          stroke: STROKE,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0], label: { text: 'first', position: 0.25, sloped: true } },
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0], label: { text: 'second', position: 0.75, sloped: true } },
          ],
        },
      ],
    });
    const fragments = strokeFragments(scene.primitives);

    expect(fragments).toHaveLength(4);
    expect(coversX(fragments.slice(0, 2), 25)).toBe(false);
    expect(coversX(fragments.slice(2), 75)).toBe(false);
  });

  it('samples a generator label from its generated command walk before creating the gap', () => {
    const stair = definePathGenerator({
      name: 'interruption-stair',
      paramsSchema: strictObject({}),
      generate: ({ from, to }) => {
        const end: [number, number] = to ?? [from[0] + 10, from[1] + 100];
        return [
          { kind: 'line' as const, to: [from[0] + 10, from[1]] as [number, number] },
          { kind: 'line' as const, to: end },
        ];
      },
    });
    const scene = compile(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            stroke: STROKE,
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              {
                type: 'step',
                kind: 'generator',
                name: 'interruption-stair',
                to: [10, 100],
                params: {},
                label: { text: 'generator', position: 0.5, sloped: true },
              },
            ],
          },
        ],
      },
      { pathGenerators: [stair] },
    );

    expect(rotationCenter(scene.primitives, 'generator')).toEqual([10, 45]);
    expect(strokeFragments(scene.primitives)).toHaveLength(2);
  });
});
