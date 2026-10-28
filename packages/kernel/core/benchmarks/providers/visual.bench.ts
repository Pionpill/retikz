import { BUILTIN_ARROWS, BUILTIN_PATTERNS, BUILTIN_CLIPS } from '@retikz/core';
import type { MarkEmitContext, PatternEmitContext, ScenePrimitive } from '@retikz/core';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { resolveMarkRegistry } from '../../src/providers/mark';

/** 每个内置外观保留一个带显式描边的代表输入 */
const markContexts: Array<MarkEmitContext> = [
  {
    params: {},
    fill: '#123456',
    stroke: '#abcdef',
    lineWidth: 2,
    dashPattern: [3, 2],
    dashOffset: 1,
    lineCap: 'round',
    lineJoin: 'round',
    round: Math.round,
  },
];
for (const [family, definitions] of [
  ['arrow', BUILTIN_ARROWS],
  ['mark', resolveMarkRegistry(undefined, new Map())],
] as const) {
  for (const definition of definitions.values()) {
    for (const context of markContexts) {
      defineBenchmark(
        {
          id: `providers/${family}/${definition.name}/emit/styled`,
          dimensions: [`${family} emit`, definition.name, '显式描边'],
        },
        () => ({
          run: () => Array.from(definition.emit(context)),
          verify: result => {
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
              stroke: context.stroke,
              fill: definition.hollow ? 'none' : context.fill,
            });
            if (definition.hollow) expect(result[0]).toMatchObject({ strokeWidth: context.lineWidth });
            if (context.dashPattern)
              expect(result[0]).toMatchObject({
                dashPattern: [3, 2],
                dashOffset: 1,
                lineCap: 'round',
                lineJoin: 'round',
              });
            if (result[0].type === 'path') {
              expect(result[0].commands[0].kind).toBe('move');
              expect(result[0].commands.length).toBeGreaterThanOrEqual(3);
            } else expect(result[0]).toMatchObject({ type: 'ellipse', cx: 5, cy: 5 });
          },
        }),
      );
    }
  }
}

for (const definition of BUILTIN_PATTERNS.values()) {
  const contexts: Array<{ label: string; context: PatternEmitContext }> = [
    {
      label: '背景与描边',
      context: {
        size: 8,
        color: '#123456',
        background: '#ffffff',
        lineWidth: 2,
        dashPattern: [3, 2],
        round: Math.round,
      },
    },
  ];
  if (definition.name === 'grid')
    contexts.push({
      label: '方向样式',
      context: {
        size: 8,
        color: '#123456',
        horizontalStyle: { color: '#ff0000' },
        verticalStyle: { color: '#0000ff' },
        round: Math.round,
      },
    });
  if (definition.name === 'lines')
    for (const period of [8, 32])
      contexts.push({
        label: `周期${period}`,
        context: {
          size: 8,
          color: '#123456',
          round: Math.round,
          lineStyleCycle: {
            period,
            styles: Array.from({ length: period }, (_, index) => ({ color: index % 2 === 0 ? '#ff0000' : '#0000ff' })),
          },
        },
      });
  for (const { label, context } of contexts)
    defineBenchmark(
      { id: `providers/pattern/${definition.name}/${label}`, dimensions: ['Pattern emit', definition.name, label] },
      () => ({
        run: () => {
          const output = definition.emit(context);
          return 'motif' in output
            ? { tileSize: output.tileSize, motif: Array.from(output.motif) }
            : { tileSize: context.size, motif: Array.from(output) };
        },
        verify: result => {
          const count = context.lineStyleCycle?.period ?? (definition.name === 'grid' ? 2 : 1);
          expect(result.tileSize).toBe(context.size * (context.lineStyleCycle?.period ?? 1));
          expect(result.motif).toHaveLength(count + (context.background ? 1 : 0));
          if (context.background)
            expect(result.motif[0]).toMatchObject({
              type: 'rect',
              fill: context.background,
              width: result.tileSize,
              height: result.tileSize,
            });
          const motif: Array<ScenePrimitive> = context.background ? result.motif.slice(1) : result.motif;
          if (definition.name === 'dots')
            expect(motif[0]).toMatchObject({
              type: 'ellipse',
              cx: 4,
              cy: 4,
              rx: Math.round(context.lineWidth ?? 1.6),
              fill: context.color,
            });
          else
            motif.forEach((primitive, index) => {
              const color =
                context.lineStyleCycle?.styles[index].color ??
                (index === 0 ? context.horizontalStyle?.color : context.verticalStyle?.color) ??
                context.color;
              expect(primitive).toMatchObject({ type: 'path', stroke: color });
              if (primitive.type === 'path') expect(primitive.commands).toHaveLength(2);
            });
        },
      }),
    );
}

const clip = BUILTIN_CLIPS.get('rect')!;
for (const size of [80])
  defineBenchmark(
    { id: `providers/clip/rect/${size}`, dimensions: ['Clip lower', 'rect', size === 0 ? '零尺寸' : '普通矩形'] },
    () => {
      const input = clip.schema.parse({ kind: 'rect', params: { x: 10, y: 20, width: size, height: size } });
      return {
        run: () =>
          clip.lower(input, {
            round: Math.round,
            lower: () => {
              throw new Error('Rect clip must not lower children');
            },
          }),
        verify: result =>
          expect(result).toEqual({
            fillRule: 'nonzero',
            commands: [
              { kind: 'move', to: [10, 20] },
              { kind: 'line', to: [10 + size, 20] },
              { kind: 'line', to: [10 + size, 20 + size] },
              { kind: 'line', to: [10, 20 + size] },
              { kind: 'close' },
            ],
          }),
      };
    },
  );
