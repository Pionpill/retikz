import type {
  IRPathBase,
  IRStep,
  PathCompileContext,
  PathDefinitionCompileContext,
  PathCompileResult,
  ScenePrimitive,
  IRPosition,
} from '@retikz/core';
import {
  compilePath,
  composeScopeTransform,
  definePath,
  defineMark,
  defineArrow,
  PathSchema,
  resolvePath,
  resolveScopeInheritance,
} from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';
import { literal } from 'zod';

import { createSharedCompileContext, createWorkspaceCompileState } from '../../src/compile';

const fixture = (
  produce: (context: PathDefinitionCompileContext) => PathCompileResult | null = context => context.emitStroke(),
  options: Parameters<typeof createSharedCompileContext>[0] = {},
) => {
  const compile = vi.fn(produce);
  const definition = definePath({
    name: 'prepared',
    schema: PathSchema.extend({ kind: literal('prepared') }),
    compile,
  });
  const shared = createSharedCompileContext({ ...options, paths: [definition, ...(options.paths ?? [])] });
  const workspace = createWorkspaceCompileState(shared);
  const pointOfTarget = vi.fn(
    (target: Parameters<PathCompileContext['targetResolver']['pointOfTarget']>[0]): IRPosition | null =>
      Array.isArray(target) ? target : [30, 20],
  );
  const registerPaint = vi.fn(workspace.paintRegistry.register);
  const context: PathCompileContext = {
    ...shared.layout,
    ...shared.host,
    registries: shared.registries,
    irPath: ['children', 0],
    scopeChain: [],
    scopeDefaults: {},
    theme: resolveScopeInheritance({}, shared.registries.themeRegistry).theme,
    targetResolver: { pointOfTarget },
    boundaryStore: workspace.boundaryStore,
    registerPaint,
    resources: workspace.paintRegistry.getResources,
    onWarn: workspace.diagnosticCollector.collect,
    resolveTransform: composeScopeTransform,
  };
  const resolve = (input: IRPathBase) =>
    resolvePath(input, {
      ...shared.registries,
      ...shared.layout,
      gatingOn: false,
      scopeDefaults: {},
      mode: 'light',
      irPath: context.irPath,
    });
  const input: IRPathBase = {
    type: 'path',
    kind: 'prepared',
    children: [
      { type: 'step', kind: 'move', to: { id: 'a' } },
      { type: 'step', kind: 'line', to: { relative: [20, 10] } },
      { type: 'step', kind: 'line', to: { relativeAccumulate: [40, 20] } },
    ],
  };
  return { compile, shared, workspace, context, pointOfTarget, registerPaint, resolve, input };
};

describe('Path prepared 复用', () => {
  it('完整命中跳过目标、Definition 与资源登记，并保留已有目标', () => {
    const f = fixture();
    const canon = f.resolve({ ...f.input, style: { fill: { kind: 'pattern', shape: 'lines' } } });
    const first = compilePath(canon, f.context);
    const before = JSON.stringify(first.emit);
    const resources = f.workspace.paintRegistry.getResources();
    expect(resources.length).toBeGreaterThan(0);
    const restored = createWorkspaceCompileState(f.shared);
    resources.forEach(resource => restored.paintRegistry.importResource(resource));
    const registerPaint = vi.fn(restored.paintRegistry.register);
    f.compile.mockClear();
    f.pointOfTarget.mockClear();
    const next = compilePath(
      canon,
      { ...f.context, registerPaint, resources: restored.paintRegistry.getResources },
      first,
    );
    expect(next.emit).toBe(first.emit);
    expect(next.targets).toBe(first.targets);
    expect(f.compile).not.toHaveBeenCalled();
    expect(f.pointOfTarget).not.toHaveBeenCalled();
    expect(registerPaint).not.toHaveBeenCalled();
    expect(restored.paintRegistry.getResources()).toEqual(resources);
    const overallOnly = compilePath(canon, f.context, { emit: first.emit });
    expect(overallOnly.targets).toBeUndefined();
    expect(JSON.stringify(first.emit)).toBe(before);
  });

  it('目标复用保留相对坐标语义，并重新消费当前样式和步骤标签', () => {
    const f = fixture();
    const first = compilePath(f.resolve(f.input), f.context);
    const input: IRPathBase = {
      ...f.input,
      style: { stroke: 'red' },
      children: f.input.children?.map(step => (step.kind === 'line' ? { ...step, label: { text: 'new' } } : step)),
    };
    const canon = f.resolve(input);
    const expected = compilePath(canon, f.context);
    f.pointOfTarget.mockClear();
    f.compile.mockClear();
    const next = compilePath(canon, f.context, { targets: first.targets });
    expect(next.emit).toEqual(expected.emit);
    expect(next.emit).not.toEqual(first.emit);
    expect(next.targets).toBe(first.targets);
    expect(f.pointOfTarget).not.toHaveBeenCalled();
    expect(f.compile).toHaveBeenCalledTimes(1);
  });

  it.each<Array<IRStep>>([
    [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [40, 0] },
      { type: 'step', kind: 'line', to: { relative: [10, 20] } },
    ],
    [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'smooth', points: [[10, 10], { relativeAccumulate: [10, 10] }, [50, 0]] },
      { type: 'step', kind: 'line', to: { relative: [10, 20] } },
    ],
    [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'rectangle', from: [0, 0], to: [50, 30] },
    ],
  ])('目标复用保持游标延迟目标与独立形状步骤', (...children) => {
    const f = fixture();
    const canon = f.resolve({ ...f.input, children });
    const first = compilePath(canon, f.context);
    f.pointOfTarget.mockClear();
    const next = compilePath(canon, f.context, { targets: first.targets });
    expect(next.emit).toEqual(first.emit);
    expect(f.pointOfTarget).not.toHaveBeenCalled();
  });

  it('null 与空 Map 都是已计算结果，空数组输出仍区别于 null', () => {
    const f = fixture(() => null);
    const canon = f.resolve({ type: 'path', kind: 'prepared' });
    const first = compilePath(canon, f.context);
    expect(first.targets?.size).toBe(0);
    expect(first.emit).toBeNull();
    f.compile.mockClear();
    expect(compilePath(canon, f.context, first).emit).toBeNull();
    expect(f.compile).not.toHaveBeenCalled();
    const emptyTargets = compilePath(canon, f.context, { targets: first.targets });
    expect(emptyTargets.targets).toBe(first.targets);
    expect(f.compile).toHaveBeenCalledTimes(1);
    f.compile.mockReturnValue({ primitives: [], boundsPoints: [] });
    expect(compilePath(canon, f.context).emit).toEqual({ primitives: [], boundsPoints: [] });
  });

  it('自定义 kind 的一次性迭代器被快照，整体可重复复用', () => {
    const primitive: ScenePrimitive = { type: 'rect', x: 0, y: 0, width: 8, height: 6, fill: 'blue' };
    const f = fixture(() => ({
      primitives: (function* () {
        yield primitive;
      })(),
      boundsPoints: (function* (): Generator<IRPosition> {
        yield [0, 0];
        yield [8, 6];
      })(),
    }));
    const canon = f.resolve({ type: 'path', kind: 'prepared' });
    const first = compilePath(canon, f.context);
    expect(first.emit).toEqual({
      primitives: [primitive],
      boundsPoints: [
        [0, 0],
        [8, 6],
      ],
    });
    const second = compilePath(canon, f.context, first);
    expect(compilePath(canon, f.context, second).emit).toBe(first.emit);
    expect(f.compile).toHaveBeenCalledTimes(1);
  });
});

describe('Path 原子阶段复用', () => {
  it('返回可回传的描边产物，几何复用后消费当前标签', () => {
    const f = fixture();
    const input = { ...f.input, kind: 'stroke', label: { text: 'before', interrupt: false } };
    const first = compilePath(f.resolve(input), f.context);
    expect(first.stroke?.layout?.geometry).toBeDefined();
    expect(first.stroke?.layout?.overall).toBeDefined();
    expect(first.stroke?.emit?.overall).toBeDefined();
    const nextInput = { ...input, label: { text: 'after', interrupt: false } };
    const expected = compilePath(f.resolve(nextInput), f.context);
    const next = compilePath(f.resolve(nextInput), f.context, {
      targets: first.targets,
      stroke: { layout: { geometry: first.stroke?.layout?.geometry, metrics: first.stroke?.layout?.metrics } },
    });
    expect(next.emit).toEqual(expected.emit);
    expect(next.stroke?.layout?.geometry).toBe(first.stroke?.layout?.geometry);
    expect(JSON.stringify(next.emit)).toContain('after');
    expect(JSON.stringify(next.emit)).not.toContain('before');
  });

  it('路径变化时复用标签排版和局部绘制，重新放置并保持旧结果', () => {
    const f = fixture();
    const measureText = vi.fn(f.context.measureText);
    const context = { ...f.context, measureText };
    const input = { ...f.input, kind: 'stroke', label: { text: 'label', interrupt: true } };
    const first = compilePath(f.resolve(input), context);
    const before = JSON.stringify(first);
    const nextInput = {
      ...input,
      children: [
        { type: 'step' as const, kind: 'move' as const, to: [0, 0] as IRPosition },
        { type: 'step' as const, kind: 'line' as const, to: [180, 60] as IRPosition },
      ],
    };
    const expected = compilePath(f.resolve(nextInput), context);
    measureText.mockClear();
    const previousLabel = first.stroke?.layout?.labels?.host?.[0];
    const previousEmit = first.stroke?.emit?.labels?.host?.[0];
    const next = compilePath(f.resolve(nextInput), context, {
      stroke: {
        layout: { labels: { host: [{ measurement: previousLabel?.measurement }] } },
        emit: { labels: { host: [{ content: previousEmit?.content }] } },
      },
    });
    expect(next.emit).toEqual(expected.emit);
    expect(measureText).not.toHaveBeenCalled();
    expect(next.stroke?.layout?.labels?.host?.[0]?.measurement).toBe(previousLabel?.measurement);
    expect(next.stroke?.emit?.labels?.host?.[0]?.content).toBe(previousEmit?.content);
    expect(JSON.stringify(first)).toBe(before);
  });

  it('绘制外观变化可复用整体布局和主线几何', () => {
    const f = fixture();
    const first = compilePath(
      f.resolve({ ...f.input, kind: 'stroke', label: { text: 'x', interrupt: true } }),
      f.context,
    );
    const resolution = f.resolve({
      ...f.input,
      kind: 'stroke',
      style: { stroke: 'red' },
      label: { text: 'x', interrupt: true },
    });
    const expected = compilePath(resolution, f.context);
    const measureText = vi.fn(f.context.measureText);
    const next = compilePath(
      resolution,
      { ...f.context, measureText },
      {
        targets: first.targets,
        stroke: { layout: first.stroke?.layout },
      },
    );
    expect(next.emit).toEqual(expected.emit);
    expect(next.stroke?.layout?.overall).toBe(first.stroke?.layout?.overall);
    expect(next.stroke?.layout?.body).toBe(first.stroke?.layout?.body);
    expect(measureText).not.toHaveBeenCalled();
  });

  it('显式传入其他路径的描边不消费当前路径的细分缓存', () => {
    let alternate = false;
    const f = fixture(context =>
      alternate
        ? context.emitStroke({
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [10, 10] },
              { type: 'step', kind: 'line', to: [90, 70] },
            ],
          })
        : context.emitStroke(),
    );
    const resolution = f.resolve(f.input);
    const first = compilePath(resolution, f.context);
    alternate = true;
    const expected = compilePath(resolution, f.context);
    const next = compilePath(resolution, f.context, { stroke: first.stroke });
    expect(next.emit).toEqual(expected.emit);
    expect(next.stroke).toBeUndefined();
  });
});

describe('Path 局部图元缓存与隔离', () => {
  it('路径变化复用箭头与 mark 内容，恢复资源后更新放置并保留旧缓存', () => {
    const emitArrow = vi.fn<Parameters<typeof defineArrow>[0]['emit']>(context => [
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [10, 5] },
          { kind: 'line', to: [0, 10] },
        ],
        stroke: context.stroke,
        fill: context.fill,
      },
    ]);
    const emitMark = vi.fn<Parameters<typeof defineMark>[0]['emit']>(context => [
      { type: 'ellipse', cx: 5, cy: 5, rx: 3, ry: 3, fill: context.fill },
    ]);
    const f = fixture(undefined, {
      arrows: [defineArrow({ name: 'cached-arrow', backX: 0, lineContactX: 0, emit: emitArrow })],
      marks: [defineMark({ name: 'cached-mark', emit: emitMark })],
    });
    const input: IRPathBase = {
      type: 'path',
      kind: 'stroke',
      style: { stroke: 'blue', strokeWidth: 2 },
      arrow: { end: { shape: 'cached-arrow' } },
      marks: [{ pos: 0.3, shape: 'cached-mark', fill: { kind: 'pattern', shape: 'lines' } }],
      label: { text: 'gap', interrupt: true },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [180, 0] },
      ],
    };
    const first = compilePath(f.resolve(input), f.context);
    const before = JSON.stringify(first);
    const nextInput: IRPathBase = {
      ...input,
      style: { stroke: 'red', strokeWidth: 2 },
      children: [
        { type: 'step', kind: 'move', to: [10, 20] },
        { type: 'step', kind: 'curve', control: [80, -90], to: [150, 70] },
      ],
      marks: input.marks?.map(mark => ({ ...mark, pos: 0.7 })),
    };
    const expected = compilePath(f.resolve(nextInput), f.context);
    const restored = createWorkspaceCompileState(f.shared);
    f.workspace.paintRegistry.getResources().forEach(resource => restored.paintRegistry.importResource(resource));
    emitArrow.mockClear();
    emitMark.mockClear();
    const next = compilePath(
      f.resolve(nextInput),
      { ...f.context, registerPaint: restored.paintRegistry.register, resources: restored.paintRegistry.getResources },
      {
        stroke: {
          layout: { labels: { host: [{ measurement: first.stroke?.layout?.labels?.host?.[0]?.measurement }] } },
          emit: {
            arrows: first.stroke?.emit?.arrows,
            marks: first.stroke?.emit?.marks?.map(mark => ({ content: mark.content })),
            labels: { host: [{ content: first.stroke?.emit?.labels?.host?.[0]?.content }] },
          },
        },
      },
    );
    expect(next.emit).toEqual(expected.emit);
    expect(emitArrow).not.toHaveBeenCalled();
    expect(emitMark).not.toHaveBeenCalled();
    expect(next.stroke?.emit?.arrows?.end?.content).toBe(first.stroke?.emit?.arrows?.end?.content);
    expect(next.stroke?.emit?.marks?.[0]?.content).toBe(first.stroke?.emit?.marks?.[0]?.content);
    expect(next.stroke?.layout?.marks?.[0]?.placement).not.toEqual(first.stroke?.layout?.marks?.[0]?.placement);
    expect(JSON.stringify(first)).toBe(before);
  });

  it('复用已放置标签和主体时，宿主身份与变换包装不改写缓存', () => {
    const f = fixture();
    const input: IRPathBase = {
      type: 'path',
      kind: 'stroke',
      label: { text: 'label', interrupt: true },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [160, 0] },
      ],
    };
    const first = compilePath(f.resolve(input), f.context);
    const before = JSON.stringify(first);
    const resolution = f.resolve({ ...input, id: 'new-id', meta: { owner: 'new' }, rotate: 30 });
    const expected = compilePath(resolution, f.context);
    const registerPaint = vi.fn((paint: Parameters<PathCompileContext['registerPaint']>[0]) =>
      f.context.registerPaint(paint),
    );
    const next = compilePath(
      resolution,
      { ...f.context, registerPaint },
      {
        stroke: {
          layout: first.stroke?.layout,
          emit: { body: first.stroke?.emit?.body, labels: first.stroke?.emit?.labels },
        },
      },
    );
    expect(registerPaint).not.toHaveBeenCalled();
    expect(next.emit).toEqual(expected.emit);
    expect(next.stroke?.emit?.body).toBe(first.stroke?.emit?.body);
    expect(next.stroke?.emit?.labels?.host?.[0]?.overall).toBe(first.stroke?.emit?.labels?.host?.[0]?.overall);
    expect(JSON.stringify(first)).toBe(before);
  });

  it('Definition 修改宿主返回的图元时，内部缓存与后续无参数调用保持独立', () => {
    const f = fixture(context => {
      const first = context.emitStroke();
      if (first === null) return null;
      const primitives = Array.from(first.primitives);
      const before = structuredClone(first);
      primitives[0].id = 'provider-mutated';
      const primitive = primitives[0];
      if (primitive.type !== 'path') throw new Error('Expected a path');
      const command = primitive.commands[0];
      if (command.kind !== 'move') throw new Error('Expected a move');
      command.to[0] = 999;
      Array.from(first.boundsPoints)[0][1] = 777;
      const second = context.emitStroke();
      expect(second).toEqual(before);
      expect(Array.from(second?.primitives ?? [])[0]?.id).toBeUndefined();
      return { ...first, primitives };
    });
    const result = compilePath(f.resolve(f.input), f.context);
    expect(result.emit?.primitives[0]?.id).toBe('provider-mutated');
    expect(result.stroke?.emit?.overall?.primitives[0]?.id).toBeUndefined();
  });
});

describe('描边整体与局部布局命中', () => {
  it('仅提供描边整体绘制时不反推缺失布局，null 同样命中', () => {
    const f = fixture();
    const resolution = f.resolve({ ...f.input, kind: 'stroke', label: { text: 'label' } });
    const first = compilePath(resolution, f.context);
    const measureText = vi.fn(f.context.measureText);
    const registerPaint = vi.fn((paint: Parameters<PathCompileContext['registerPaint']>[0]) =>
      f.context.registerPaint(paint),
    );
    const next = compilePath(
      resolution,
      { ...f.context, measureText, registerPaint },
      { targets: first.targets, stroke: { emit: { overall: first.stroke?.emit?.overall } } },
    );
    expect(next.emit).toEqual(first.emit);
    expect(next.stroke?.layout).toBeUndefined();
    expect(registerPaint).not.toHaveBeenCalled();
    expect(next.stroke?.emit?.overall).toBe(first.stroke?.emit?.overall);
    expect(measureText).not.toHaveBeenCalled();
    const empty = compilePath(resolution, f.context, { stroke: { emit: { overall: null } } });
    expect(empty.emit).toBeNull();
    expect(empty.stroke?.layout).toBeUndefined();
  });

  it('逐标签和标记放置与 body 命中时，无需反推逻辑度量', () => {
    const f = fixture();
    const input: IRPathBase = {
      ...f.input,
      kind: 'stroke',
      label: { text: 'gap', interrupt: true },
      marks: [{ pos: 0.3, shape: 'plus' }],
    };
    const first = compilePath(f.resolve(input), f.context);
    const resolution = f.resolve({ ...input, style: { stroke: 'red' } });
    const expected = compilePath(resolution, f.context);
    const measureText = vi.fn(f.context.measureText);
    const next = compilePath(
      resolution,
      { ...f.context, measureText },
      {
        targets: first.targets,
        stroke: {
          layout: {
            geometry: first.stroke?.layout?.geometry,
            labels: first.stroke?.layout?.labels,
            marks: first.stroke?.layout?.marks,
            body: first.stroke?.layout?.body,
          },
        },
      },
    );
    expect(next.emit).toEqual(expected.emit);
    expect(next.stroke?.layout?.metrics).toBeUndefined();
    expect(next.stroke?.layout?.labels?.host?.[0]?.placement).toBe(first.stroke?.layout?.labels?.host?.[0]?.placement);
    expect(next.stroke?.layout?.marks?.[0]?.placement).toBe(first.stroke?.layout?.marks?.[0]?.placement);
    expect(next.stroke?.layout?.body).toBe(first.stroke?.layout?.body);
    expect(measureText).not.toHaveBeenCalled();
  });
});
