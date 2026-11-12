import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import type { IRClip } from '../../../core/src';
import { createClipRegistry, defineClip, resolveClip } from '../../../core/src';
import { createWorkspaceClipRegistry } from '../../src/compile/runtime/state/clip-cache';

const setup = () => {
  let calls = 0;
  const definition = defineClip({
    kind: 'cached',
    schema: strictObject({ kind: literal('cached'), params: strictObject({ x: number() }) }),
    lower: spec => {
      calls += 1;
      return {
        commands: [
          { kind: 'move' as const, to: [Object.is(spec.params.x, -0) ? 99 : spec.params.x, 0] as [number, number] },
          { kind: 'line' as const, to: [10, 10] as [number, number] },
        ],
        fillRule: 'nonzero' as const,
      };
    },
  });
  const definitions = new Map([[definition.kind, definition]]);
  return {
    registry: createWorkspaceClipRegistry(createClipRegistry(n => n)),
    resolve: (spec: IRClip) => resolveClip(spec, { clipRegistry: definitions }),
    calls: () => calls,
  };
};

describe('工作区裁剪复用', () => {
  it('JSON 文本相同的负零与正零不能复用不同的降解结果', () => {
    const { registry, resolve } = setup();
    const negative = resolve({ kind: 'cached', params: { x: -0 } });
    registry.register(negative);
    const negativeId = registry.register(negative);
    const positiveId = registry.register(resolve({ kind: 'cached', params: { x: 0 } }));
    expect(positiveId).not.toBe(negativeId);
    expect(registry.getResources()).toHaveLength(2);
  });

  it('等值输入复用且原地修改输入后重新生成路径', () => {
    const { registry, resolve, calls } = setup();
    const spec = { kind: 'cached', params: { x: 0 } };
    const first = registry.register(resolve(spec));
    expect(registry.register(resolve(structuredClone(spec)))).toBe(first);
    expect(registry.register(resolve(structuredClone(spec)))).toBe(first);
    expect(calls()).toBe(2);
    spec.params.x = 2;
    expect(registry.register(resolve(spec))).not.toBe(first);
    expect(calls()).toBe(3);
  });

  it('预检不登记资源且修改返回路径后不复用过期路径或身份', () => {
    const { registry, resolve, calls } = setup();
    const input = resolve({ kind: 'cached', params: { x: 0 } });
    registry.lower(input);
    const path = registry.lower(input);
    expect(registry.getResources()).toEqual([]);
    path.commands.push({ kind: 'line', to: [20, 20] });
    const changed = registry.registerPath(path);
    const original = registry.register(input);
    expect(original).not.toBe(changed);
    expect(calls()).toBe(3);
    expect(registry.getResources()).toHaveLength(2);
  });

  it('缓存登记仍拒绝已导入的冲突资源', () => {
    const { registry, resolve } = setup();
    const input = resolve({ kind: 'cached', params: { x: 0 } });
    registry.register(input);
    const id = registry.register(input);
    const resource = registry.getResources()[0];
    resource.path = {
      commands: [
        { kind: 'move', to: [1, 1] },
        { kind: 'line', to: [2, 2] },
      ],
      fillRule: 'nonzero',
    };
    expect(() => registry.register(input)).toThrow();
    expect(resource.id).toBe(id);
  });
});
