import { describe, expect, it, vi } from 'vitest';

import type { IRScope, ScopeCompileContext } from '../../../../core/src';
import {
  compileScope,
  createClipRegistry,
  createPositionEvaluateContext,
  resolveScope,
  resolveScopeInheritance,
} from '../../../../core/src';
import { createSharedCompileContext } from '../../../src/compile';

const fixture = () => {
  const shared = createSharedCompileContext();
  const registry = createClipRegistry(shared.layout.round);
  const lookupReference = vi.fn(() => ({
    state: 'resolved' as const,
    geometry: { position: [80, 100] as [number, number] },
  }));
  const registerClip = vi.fn(registry.register);
  const registerClipPath = vi.fn(registry.registerPath);
  const context: ScopeCompileContext = {
    layouts: [{ position: [0, 0] }, { position: [20, 10] }],
    positionContext: createPositionEvaluateContext({ nodeDistance: 10, lookupReference }),
    irPath: [],
    onWarn: () => {},
    registerClip,
    registerClipPath,
  };
  const resolve = (input: IRScope) =>
    resolveScope(input, {
      ...shared.registries,
      nodeDistance: 10,
      parent: resolveScopeInheritance({}, shared.registries.themeRegistry),
      irPath: [],
    });
  const source: IRScope = {
    type: 'scope',
    id: 'box',
    children: [],
    position: { kind: 'anchor', target: { id: 'target' }, selfAnchor: 'center' },
  };
  return { context, resolve, source, lookupReference, registerClip, registerClipPath, registry, shared };
};

describe('Scope prepared 阶段复用', () => {
  it('整体复用跳过布局与裁剪计算，并保留已有局部产物', () => {
    const { context, resolve, source, lookupReference, registerClip } = fixture();
    const canon = resolve({ ...source, clip: { kind: 'rect', params: { x: 0, y: 0, width: 10, height: 10 } } });
    const first = compileScope(canon, context);
    const before = JSON.stringify(first);
    lookupReference.mockClear();
    registerClip.mockClear();
    const readLayouts = vi.fn(() => context.layouts);
    const next = compileScope(
      canon,
      {
        ...context,
        get layouts() {
          return readLayouts();
        },
      },
      first,
    );
    expect(next.layout.overall).toBe(first.layout.overall);
    expect(next.emit.overall).toBe(first.emit.overall);
    expect(next.layout.envelope).toBe(first.layout.envelope);
    expect(next.emit.clip).toBe(first.emit.clip);
    expect(readLayouts).not.toHaveBeenCalled();
    expect(lookupReference).not.toHaveBeenCalled();
    expect(registerClip).not.toHaveBeenCalled();
    const overallOnly = compileScope(canon, context, {
      layout: { overall: first.layout.overall },
      emit: { overall: first.emit.overall },
    });
    expect(overallOnly.layout.envelope).toBeUndefined();
    expect(overallOnly.emit.clip).toBeUndefined();
    expect(JSON.stringify(first)).toBe(before);
  });

  it('包络复用仍执行当前放置，最终放置命中不再查询引用', () => {
    const { context, resolve, source, lookupReference } = fixture();
    const first = compileScope(resolve(source), context);
    const canon = resolve({ ...source, transforms: [{ kind: 'rotate', degrees: 90, pivot: 'center' }] });
    const expected = compileScope(canon, context);
    lookupReference.mockClear();
    const readLayouts = vi.fn(() => context.layouts);
    const actual = compileScope(
      canon,
      {
        ...context,
        get layouts() {
          return readLayouts();
        },
      },
      { layout: { envelope: first.layout.envelope } },
    );
    expect(actual).toEqual(expected);
    expect(readLayouts).not.toHaveBeenCalled();
    expect(lookupReference).toHaveBeenCalled();
    lookupReference.mockClear();
    const placed = compileScope(canon, context, {
      layout: { envelope: actual.layout.envelope, placement: actual.layout.placement },
    });
    expect(placed.layout.overall).toEqual(expected.layout.overall);
    expect(placed.layout.preparation).toBeUndefined();
    expect(lookupReference).not.toHaveBeenCalled();
  });

  it('冻结的前置引用用于包络收尾，整体命中使用当前查询绑定', () => {
    const { context, resolve, source, lookupReference } = fixture();
    const canon = resolve(source);
    const first = compileScope(canon, context);
    lookupReference.mockClear();
    const actual = compileScope(canon, context, { layout: { preparation: first.layout.preparation } });
    expect(actual).toEqual(first);
    expect(lookupReference).not.toHaveBeenCalled();
    const current = {
      ...canon,
      envelope: {
        ...canon.envelope,
        shape: { ...canon.envelope.shape, definition: { ...canon.envelope.shape.definition } },
      },
    };
    const cached = compileScope(current, context, first);
    expect(cached.shape).toBe(current.envelope.shape);
    expect(cached.layout.overall.geometry).toBe(first.layout.overall.geometry);
  });

  it('裁剪资源导入后可复用并更新分组元数据，不污染已有结果', () => {
    const { context, resolve, source, registry, shared } = fixture();
    const input: IRScope = { ...source, clip: { kind: 'rect', params: { x: 0, y: 0, width: 10, height: 10 } } };
    const first = compileScope(resolve(input), context);
    const before = JSON.stringify(first);
    const restored = createClipRegistry(shared.layout.round);
    registry.getResources().forEach(resource => restored.importResource(resource));
    const registerClip = vi.fn(restored.register);
    const next = compileScope(
      resolve({ ...input, id: 'next', meta: { title: 'updated' } }),
      { ...context, registerClip },
      { layout: first.layout, emit: { clip: first.emit.clip } },
    );
    expect(next.emit.overall).toMatchObject({
      id: 'next',
      meta: { title: 'updated' },
      clipRef: first.emit.overall.clipRef,
    });
    expect(restored.getResources()).toEqual(registry.getResources());
    expect(registerClip).not.toHaveBeenCalled();
    expect(JSON.stringify(first)).toBe(before);
  });

  it('无裁剪空产物是有效命中，分组属性不持有子图元', () => {
    const { context, resolve, source, registerClip, registerClipPath } = fixture();
    const first = compileScope(resolve(source), context);
    const result = compileScope(resolve(source), context, { emit: { clip: first.emit.clip } });
    expect(result.emit.overall.clipRef).toBeUndefined();
    expect(result.emit.overall).not.toHaveProperty('children');
    expect(registerClip).not.toHaveBeenCalled();
    expect(registerClipPath).not.toHaveBeenCalled();
  });
});
