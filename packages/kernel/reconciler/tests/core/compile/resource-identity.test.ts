import { describe, expect, it } from 'vitest';

import { createClipRegistry } from '../../../../core/src/compile/resource';
import {
  createResourceId,
  serializeResourceContent,
  storeSceneResource,
} from '../../../../core/src/compile/resource/identity';
import type { SceneClipPath, ClipResource } from '../../../../core/src/contract';

/** 直接按 FNV-1a 定义计算，作为固定宽度整数实现的独立参考 */
const referenceId = (content: string): string => {
  let hash = 0x6c62272e07bb014262b821756295c58dn;
  for (let index = 0; index < content.length; index++) {
    const code = content.charCodeAt(index);
    hash = BigInt.asUintN(128, (hash ^ BigInt(code & 255)) * 0x1000000000000000000013bn);
    hash = BigInt.asUintN(128, (hash ^ BigInt(code >>> 8)) * 0x1000000000000000000013bn);
  }
  return `clip-${hash.toString(16).padStart(32, '0')}`;
};

describe('资源内容身份', () => {
  it('冲突比较保持 JSON 对负零、可选字段和数组顺序的语义', () => {
    const resource: ClipResource = {
      kind: 'clip',
      id: 'clip-test',
      path: {
        fillRule: 'nonzero',
        commands: [
          { kind: 'arc', center: [-0, 0], radius: 1, startAngle: 0, endAngle: 90, counterClockwise: undefined },
        ],
      },
    };
    const equivalent: ClipResource = {
      kind: 'clip',
      id: resource.id,
      path: {
        commands: [{ endAngle: 90, startAngle: 0, radius: 1, center: [0, 0], kind: 'arc' }],
        fillRule: 'nonzero',
      },
    };
    const resources = new Map<string, ClipResource>();
    storeSceneResource(resource, resources);
    expect(() => storeSceneResource(equivalent, resources)).not.toThrow();
    expect(resources.get(resource.id)).toBe(resource);
    expect(() => storeSceneResource({ ...equivalent, path: { ...equivalent.path, commands: [] } }, resources)).toThrow(
      /conflicting content/,
    );
  });
  it('128 位摘要对空串、Unicode、代理项和长内容保持逐字节一致', () => {
    const inputs = ['', 'abc', '中文图案', '😀\ud800\udfff', '\0\n\t"\\', 'x'.repeat(10000)];
    for (let length = 1; length <= 256; length++) {
      inputs.push(
        Array.from({ length }, (_, index) => String.fromCharCode((index * 7919 + length * 257) & 65535)).join(''),
      );
    }
    for (const input of inputs) expect(createResourceId('clip', input)).toBe(referenceId(input));
    expect(createResourceId('paint', 'abc').slice(6)).toBe(createResourceId('clip', 'abc').slice(5));
  });

  it('规范 JSON 保留数值键顺序、省略和转义语义', () => {
    const inputs = [
      { z: undefined, b: 2, a: { '10': 'ten', '2': 'two', '01': 'one', x: -0 } },
      { '"\\\n': '\ud800😀', list: [undefined, null, 2, 'a'] },
      {
        list: [
          { b: true, a: false },
          { a: false, b: true },
        ],
      },
    ];
    for (const input of inputs) {
      const expected = JSON.stringify(input, (_key, value: unknown) => {
        if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
        return Object.fromEntries(
          Object.keys(value)
            .sort()
            .map(key => [key, Reflect.get(value, key)]),
        );
      });
      expect(serializeResourceContent(input)).toBe(expected);
    }
    expect(serializeResourceContent({ a: 1, b: 2 })).toBe(serializeResourceContent({ b: 2, a: 1 }));
    expect(serializeResourceContent([1, 2])).not.toBe(serializeResourceContent([2, 1]));
  });

  it('Clip 导入保留身份与对象，重复路径去重，冲突内容失败', () => {
    const source = createClipRegistry(value => value);
    const path: SceneClipPath = {
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [1, 1] },
      ],
      fillRule: 'nonzero',
    };
    const id = source.registerPath(path);
    const resource = source.getResources()[0];
    const target = createClipRegistry(value => value);
    expect(target.importResource(resource)).toBe(id);
    expect(target.registerPath({ fillRule: 'nonzero', commands: [...path.commands] })).toBe(id);
    expect(target.getResources()).toEqual([resource]);
    expect(target.getResources()[0]).toBe(resource);
    expect(() => target.importResource({ ...resource, path: { ...path, fillRule: 'evenodd' } })).toThrow(
      /conflicting content/,
    );
    expect(resource.path).toBe(path);
  });
});
