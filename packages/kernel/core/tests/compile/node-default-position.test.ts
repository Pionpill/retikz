import { describe, expect, it } from 'vitest';

import type { IRNode, IRScene } from '../../src';
import { compileToScene, CoordinateSchema, NodeSchema, SceneSchema } from '../../src';

/** 比较根级与嵌套局部坐标的节点输出 */
const sceneWith = (node: IRNode, nested: boolean): IRScene => ({
  type: 'scene',
  version: 1,
  children: nested
    ? [
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 40, y: -20 }],
          children: [{ type: 'scope', transforms: [{ kind: 'rotate', degrees: 30 }], children: [node] }],
        },
      ]
    : [node],
});

describe('Node default position', () => {
  it('物化 schema 默认值并保留非法输入的拒绝语义', () => {
    expect(NodeSchema.parse({ type: 'node' }).position).toEqual([0, 0]);
    expect(SceneSchema.parse(sceneWith({ type: 'node' }, false)).children[0]).toMatchObject({ position: [0, 0] });
    expect(NodeSchema.safeParse({ type: 'node', position: null }).success).toBe(false);
    expect(NodeSchema.safeParse({ type: 'node', position: { kind: 'invalid' } }).success).toBe(false);
    expect(CoordinateSchema.safeParse({ type: 'coordinate', id: 'p' }).success).toBe(false);
  });

  it.each([false, true])('省略位置与显式局部原点输出等价，nested=%s', nested => {
    const node: IRNode = { type: 'node', id: 'a', text: 'A', rotate: 15, scale: 2 };
    expect(compileToScene(sceneWith(node, nested)).scene).toEqual(
      compileToScene(sceneWith({ ...node, position: [0, 0] }, nested)).scene,
    );
    expect(node).not.toHaveProperty('position');
  });

  it('省略位置的节点仍可被相对定位与锚点对齐引用', () => {
    const source: IRNode = { type: 'node', id: 'a', text: 'A' };
    const children: Array<IRNode> = [
      source,
      { type: 'node', id: 'b', position: { of: 'a', offset: [50, 20] } },
      { type: 'node', id: 'c', position: { kind: 'anchor', target: { id: 'a', anchor: 'right' }, selfAnchor: 'left' } },
    ];
    const scene: IRScene = { type: 'scene', version: 1, children };
    expect(compileToScene(scene).scene).toEqual(
      compileToScene({ ...scene, children: [{ ...source, position: [0, 0] }, ...children.slice(1)] }).scene,
    );
  });
});
