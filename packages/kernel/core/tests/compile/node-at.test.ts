import { describe, expect, it } from 'vitest';

import type { RectPrim, ScenePrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { AtPositionSchema } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';

/** 取所有 RectPrim（节点 shape=rectangle 默认走 RectPrim；带文本节点包 group，flatten 穿透） */
const rects = (prims: Array<ScenePrimitive>): Array<RectPrim> =>
  flattenPrims(prims).filter((p): p is RectPrim => p.type === 'rect');

/** 给定一组 IR Node + at，编译后取每个 rect 的几何中心 [cx, cy] */
const centers = (ir: IRScene): Array<[number, number]> =>
  rects(compileToScene(ir).scene.primitives).map(r => [r.x + r.width / 2, r.y + r.height / 2]);

describe('Node at relative positioning', () => {
  describe('schema aliases', () => {
    it('direction 只接受 canonical 方位', () => {
      expect(AtPositionSchema.parse({ direction: 'top', of: 'A' })).toEqual({ direction: 'top', of: 'A' });
      expect(AtPositionSchema.parse({ direction: 'top-left', of: 'A' })).toEqual({
        direction: 'top-left',
        of: 'A',
      });
      expect(AtPositionSchema.parse({ direction: 'bottom-right', of: 'A' })).toEqual({
        direction: 'bottom-right',
        of: 'A',
      });
      expect(() => AtPositionSchema.parse({ direction: 'north-west', of: 'A' })).toThrow();
      expect(() => AtPositionSchema.parse({ direction: 'below', of: 'A' })).toThrow();
    });
  });

  describe('8 方向单位向量', () => {
    it('right of：水平向右 distance', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { direction: 'right', of: 'A', distance: 5 } },
        ],
      };
      const [, b] = centers(ir);
      expect(b[0]).toBeCloseTo(5);
      expect(b[1]).toBeCloseTo(0);
    });

    it('left of：水平向左 distance', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { direction: 'left', of: 'A', distance: 5 } },
        ],
      };
      const [, b] = centers(ir);
      expect(b[0]).toBeCloseTo(-5);
      expect(b[1]).toBeCloseTo(0);
    });

    it('top of：屏幕 y 减小（视觉上方）', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { direction: 'top', of: 'A', distance: 5 } },
        ],
      };
      const [, b] = centers(ir);
      expect(b[0]).toBeCloseTo(0);
      expect(b[1]).toBeCloseTo(-5);
    });

    it('bottom of：屏幕 y 增大（视觉下方）', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { direction: 'bottom', of: 'A', distance: 5 } },
        ],
      };
      const [, b] = centers(ir);
      expect(b[0]).toBeCloseTo(0);
      expect(b[1]).toBeCloseTo(5);
    });

    it('top-right：对角分量为 1/√2 × distance（斜向距离 = distance）', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { direction: 'top-right', of: 'A', distance: 10 } },
        ],
      };
      const [, b] = centers(ir);
      const expected = 10 * Math.SQRT1_2;
      expect(b[0]).toBeCloseTo(expected);
      expect(b[1]).toBeCloseTo(-expected);
      // 与 A 的距离恰好 = distance
      expect(Math.hypot(b[0], b[1])).toBeCloseTo(10);
    });

    it('bottom-left：x 减、y 增，对角分量等长', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { direction: 'bottom-left', of: 'A', distance: 8 } },
        ],
      };
      const [, b] = centers(ir);
      const expected = 8 * Math.SQRT1_2;
      expect(b[0]).toBeCloseTo(-expected);
      expect(b[1]).toBeCloseTo(expected);
    });
  });

  describe('distance 默认值优先级', () => {
    it('node.distance > options.nodeDistance', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { direction: 'right', of: 'A', distance: 7 } },
        ],
      };
      // nodeDistance=99 但 node 自带 7，应该用 7
      const scene = compileToScene(ir, { nodeDistance: 99 }).scene;
      const [, b] = rects(scene.primitives).map(r => [r.x + r.width / 2, r.y + r.height / 2]);
      expect(b[0]).toBeCloseTo(7);
    });

    it('options.nodeDistance 在 node 不带 distance 时生效', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { direction: 'right', of: 'A' } },
        ],
      };
      const scene = compileToScene(ir, { nodeDistance: 12 }).scene;
      const [, b] = rects(scene.primitives).map(r => [r.x + r.width / 2, r.y + r.height / 2]);
      expect(b[0]).toBeCloseTo(12);
    });

    it('两者都缺省 → 默认 24', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { direction: 'right', of: 'A' } },
        ],
      };
      const scene = compileToScene(ir).scene;
      const [, b] = rects(scene.primitives).map(r => [r.x + r.width / 2, r.y + r.height / 2]);
      expect(b[0]).toBeCloseTo(24);
    });
  });

  describe('链式 at（A → B → C）', () => {
    it('B at right of A、C at right of B：C 比 B 再右 distance', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { direction: 'right', of: 'A', distance: 4 } },
          { type: 'node', id: 'C', position: { direction: 'right', of: 'B', distance: 4 } },
        ],
      };
      const [, b, c] = centers(ir);
      expect(b[0]).toBeCloseTo(4);
      expect(c[0]).toBeCloseTo(8);
      expect(b[1]).toBeCloseTo(0);
      expect(c[1]).toBeCloseTo(0);
    });
  });

  describe('错误情况', () => {
    it('of 引用未定义 node → 抛错', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [{ type: 'node', id: 'B', position: { direction: 'right', of: 'A' } }],
      };
      expect(() => compileToScene(ir).scene).toThrow(/Cannot resolve position/);
    });

    it('前向引用同样不允许（B 在 A 前）→ 抛错', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'B', position: { direction: 'right', of: 'A' } },
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        ],
      };
      expect(() => compileToScene(ir).scene).toThrow(/Cannot resolve position/);
    });
  });

  describe('与 path 端点引用混用', () => {
    it('B 用 at 定位、path A → B 仍能贴边（at 不破坏 nodeIndex 注册）', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { direction: 'right', of: 'A', distance: 10 } },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'A' } },
              { type: 'step', kind: 'line', to: { id: 'B' } },
            ],
          },
        ],
      };
      const scene = compileToScene(ir).scene;
      const path = scene.primitives.find(p => p.type === 'path');
      expect(path).toBeDefined();
      // 至少有 move 和 line 两条命令
      if (path?.type === 'path') {
        expect(path.commands[0].kind).toBe('move');
        expect(path.commands.some(c => c.kind === 'line')).toBe(true);
      }
    });
  });
});
