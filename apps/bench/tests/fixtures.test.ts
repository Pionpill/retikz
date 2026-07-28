import type { ScenePrimitive } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  createSimpleNodeScene,
  createStableGroupScene,
  updateSimpleNodeFill,
  updateStableGroupFill,
} from '../src/fixtures';

/** 递归统计 Scene primitive occurrence */
const countPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): number =>
  primitives.reduce(
    (count, primitive) => count + 1 + (primitive.type === 'group' ? countPrimitives(primitive.children) : 0),
    0,
  );

describe('benchmark fixtures', () => {
  it('按数量生成稳定且唯一的 entity id', () => {
    const first = createSimpleNodeScene(100);
    const second = createSimpleNodeScene(100);

    expect(first).toEqual(second);
    expect(first.children).toHaveLength(100);
    expect(new Set(first.children.map(child => ('id' in child ? child.id : undefined))).size).toBe(100);
  });

  it('拒绝非正 safe integer 数量', () => {
    expect(() => createSimpleNodeScene(0)).toThrow(/count/i);
    expect(() => createSimpleNodeScene(1.5)).toThrow(/count/i);
  });

  it('只替换指定 stable entity 的 fill', () => {
    const current = createSimpleNodeScene(3);
    const next = updateSimpleNodeFill(current, 1, '#22c55e');

    expect(next.children[0]).toBe(current.children[0]);
    expect(next.children[1]).not.toBe(current.children[1]);
    expect(next.children[2]).toBe(current.children[2]);
    expect(next.children[1]).toMatchObject({ id: 'entity-00001', fill: '#22c55e' });
  });

  it('创建 5000 occurrence stable Group 并只替换 Group 自身', () => {
    const current = createStableGroupScene(5_000);
    const next = updateStableGroupFill(current, '#22c55e');
    const currentGroup = current.children[0];
    const nextGroup = next.children[0];

    expect(countPrimitives(compileToScene(current).scene.primitives)).toBe(5_000);
    expect(currentGroup.type).toBe('node');
    expect(nextGroup.type).toBe('node');
    if (currentGroup.type !== 'node' || nextGroup.type !== 'node') throw new Error('expected node fixture');
    expect(compileToScene(current).scene.primitives[0]).toMatchObject({
      type: 'group',
      children: [{ type: 'rect' }, { type: 'text' }],
    });
    expect(next.children[1]).toBe(current.children[1]);
    expect(nextGroup.fill).toBe('#22c55e');
  });

  it('拒绝非法 Group fixture', () => {
    expect(() => createStableGroupScene(3)).toThrow(/greater than three/i);
    expect(() => updateStableGroupFill(createSimpleNodeScene(2), '#22c55e')).toThrow(/stable-group/i);
  });
});
