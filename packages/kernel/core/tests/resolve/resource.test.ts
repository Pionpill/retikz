import { describe, expect, it, vi } from 'vitest';
import { array, literal, number, strictObject, tuple } from 'zod';

import { compileToScene } from '../../src/compile/compile';
import { createRound } from '../../src/compile/scene';
import type { ClipDefinition, ClipLowerContext, ScenePrimitive, PatternDefinition } from '../../src/contract';
import { defineClip, definePattern } from '../../src/contract';
import { resolveClipRegistry } from '../../src/providers/clip';
import { resolvePatternRegistry } from '../../src/providers/pattern';
import { resolveClip, resolvePaint } from '../../src/resolve/resource';
import type { IRClip, IRPaint, IRScene } from '../../src/schemas';

const round = createRound(3);

const patternContext = (patterns: ReadonlyArray<PatternDefinition> = []) => ({
  patternRegistry: resolvePatternRegistry(patterns),
  round,
  irPath: ['children', 0, 'fill'],
});

const sceneWithPaint = (paint: IRPaint): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      position: [0, 0],
      style: { fill: paint },
    },
  ],
});

describe('解析/资源绘制', () => {
  it('绑定内置模式并在编译前具体化默认值', () => {
    const resolved = resolvePaint({ kind: 'pattern', shape: 'lines' }, patternContext());

    expect(typeof resolved).toBe('object');
    expect(resolved).toMatchObject({ kind: 'paint', pattern: { name: 'lines', size: 8 } });
  });

  it('绑定自定义模式并在解析中应用形状/样式优先级', () => {
    const custom = definePattern({
      name: 'custom',
      emit: (): Array<ScenePrimitive> => [],
    });
    const resolved = resolvePaint(
      {
        kind: 'pattern',
        shape: 'custom',
        color: '#123456',
        dashed: true,
        dotted: true,
        dashPattern: [7, 2],
        horizontalStyle: { dotted: true },
      },
      patternContext([custom]),
    );

    expect(resolved).toMatchObject({
      kind: 'paint',
      pattern: {
        name: 'custom',
        style: {
          base: { color: '#123456', dashPattern: [7, 2] },
          horizontalStyle: { color: '#123456', dashPattern: [1, 2] },
        },
      },
    });
  });

  it('报告解析边界处的未知模式提供者', () => {
    expect(() => resolvePaint({ kind: 'pattern', shape: 'missing' }, patternContext())).toThrow(
      /Unknown provider 'missing'/,
    );
  });

  it('在编译消费已解析的绘制后保留去重边界', () => {
    const paint: IRPaint = {
      kind: 'linearGradient',
      stops: [
        { offset: 0, color: '#000' },
        { offset: 1, color: '#fff' },
      ],
    };
    const scene = compileToScene({
      ...sceneWithPaint(paint),
      children: [
        {
          type: 'node',
          position: [0, 0],
          style: { fill: paint },
        },
        {
          type: 'node',
          position: [40, 0],
          style: { fill: paint },
        },
      ],
    }).scene;

    expect(scene.resources).toHaveLength(1);
  });

  it('发出一次去重模式资源', () => {
    const emit = vi.fn((): Array<ScenePrimitive> => []);
    const pattern = definePattern({ name: 'dedupe-pattern', emit });
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            position: [0, 0],
            style: { fill: { kind: 'pattern', shape: 'dedupe-pattern' } },
          },
          {
            type: 'node',
            position: [40, 0],
            style: { fill: { kind: 'pattern', shape: 'dedupe-pattern' } },
          },
        ],
      },
      { patterns: [pattern] },
    ).scene;

    expect(scene.resources).toHaveLength(1);
    expect(emit).toHaveBeenCalledTimes(1);
  });
});

describe('解析/资源裁剪', () => {
  const polygonLower = vi.fn((spec: { kind: 'polygon'; params: { points: Array<[number, number]> } }) => ({
    commands: [
      { kind: 'move' as const, to: spec.params.points[0] },
      ...spec.params.points.slice(1).map(to => ({ kind: 'line' as const, to })),
      { kind: 'close' as const },
    ],
    fillRule: 'nonzero' as const,
  }));
  const polygon: ClipDefinition = defineClip({
    kind: 'polygon',
    schema: strictObject({
      kind: literal('polygon'),
      params: strictObject({
        points: array(tuple([number(), number()])).min(3),
      }),
    }),
    lower: polygonLower,
  });

  it('绑定裁剪定义和解析的参数，而不调用提供者', () => {
    const resolved = resolveClip(
      {
        kind: 'polygon',
        params: {
          points: [
            [0, 0],
            [10, 0],
            [0, 10],
          ],
        },
      },
      { clipRegistry: resolveClipRegistry([polygon]), irPath: ['children', 0, 'clip'] },
    );

    expect(resolved.kind).toBe('polygon');
    expect(resolved.params).toEqual({
      kind: 'polygon',
      params: {
        points: [
          [0, 0],
          [10, 0],
          [0, 10],
        ],
      },
    });
    expect(polygonLower).not.toHaveBeenCalled();
  });

  it('在绑定的注册表闭包中保留递归裁剪解析', () => {
    const leafLower = vi.fn((spec: { kind: 'leaf'; params: { radius: number } }) => ({
      commands: [
        { kind: 'move' as const, to: [0, 0] as [number, number] },
        { kind: 'line' as const, to: [spec.params.radius, 0] as [number, number] },
        { kind: 'line' as const, to: [spec.params.radius, spec.params.radius] as [number, number] },
        { kind: 'line' as const, to: [0, spec.params.radius] as [number, number] },
        { kind: 'close' as const },
      ],
      fillRule: 'nonzero' as const,
    }));
    const leaf = defineClip({
      kind: 'leaf',
      schema: strictObject({ kind: literal('leaf'), params: strictObject({ radius: number().positive() }) }),
      lower: leafLower,
    });
    const wrapperLower = vi.fn((spec: { kind: 'wrapper'; params: { child: IRClip } }, context: ClipLowerContext) =>
      context.lower(spec.params.child),
    );
    const wrapper = defineClip({
      kind: 'wrapper',
      schema: strictObject({
        kind: literal('wrapper'),
        params: strictObject({
          child: strictObject({ kind: literal('leaf'), params: strictObject({ radius: number().positive() }) }),
        }),
      }),
      lower: wrapperLower,
    });
    const clips = resolveClipRegistry([wrapper, leaf]);
    const resolution = resolveClip(
      { kind: 'wrapper', params: { child: { kind: 'leaf', params: { radius: 3 } } } },
      { clipRegistry: clips, irPath: ['children', 0, 'clip'] },
    );

    expect(wrapperLower).not.toHaveBeenCalled();
    expect(leafLower).not.toHaveBeenCalled();

    const nested = resolution.resolve({ kind: 'leaf', params: { radius: 2 } });

    expect(nested.kind).toBe('leaf');
    expect(nested.definition).toBe(leaf);

    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'scope',
            clip: { kind: 'wrapper', params: { child: { kind: 'leaf', params: { radius: 3 } } } },
            children: [],
          },
        ],
      },
      { clips: [wrapper, leaf] },
    ).scene;
    const resource = scene.resources?.find(item => item.kind === 'clip');

    expect(resource).toMatchObject({
      kind: 'clip',
      path: {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [3, 0] },
          { kind: 'line', to: [3, 3] },
          { kind: 'line', to: [0, 3] },
          { kind: 'close' },
        ],
        fillRule: 'nonzero',
      },
    });
    expect(wrapperLower).toHaveBeenCalledTimes(1);
    expect(leafLower).toHaveBeenCalledTimes(1);
  });

  it('报告解析边界处未知的裁剪提供者', () => {
    expect(() => resolveClip({ kind: 'missing', params: {} }, { clipRegistry: resolveClipRegistry() })).toThrow(
      /Unknown provider 'missing'/,
    );
  });
});
