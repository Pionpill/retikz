import { describe, expect, it } from 'vitest';

import type { ScenePrimitive, TextPrim } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
// fallback measurer 不提供 ascent / descent，Node label 规范化为上下对称视觉盒
const visualMiddle = (t: TextPrim): number => t.y;

/** 收集 scene 里所有 TextPrim（包括 group 嵌套里的） */
const collectTexts = (prims: Array<ScenePrimitive>): Array<TextPrim> => {
  const out: Array<TextPrim> = [];
  for (const p of prims) {
    if (p.type === 'text') out.push(p);
    else if (p.type === 'group') out.push(...collectTexts(p.children));
  }
  return out;
};

const findLabel = (prims: Array<ScenePrimitive>, text: string): TextPrim | undefined =>
  collectTexts(prims).find(t => t.lines.some(l => (typeof l === 'string' ? l : l.text) === text));

describe('Node label', () => {
  describe('基本生成', () => {
    it('单对象 label → 一个 TextPrim', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'foo' },
          },
        ],
      };
      const scene = compileToScene(ir).scene;
      const labelText = findLabel(scene.primitives, 'foo');
      expect(labelText).toBeDefined();
    });

    it('数组 label → 多个 TextPrim', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: [
              { text: 'top', position: 'top' },
              { text: 'bot', position: 'bottom' },
            ],
          },
        ],
      };
      const scene = compileToScene(ir).scene;
      expect(findLabel(scene.primitives, 'top')).toBeDefined();
      expect(findLabel(scene.primitives, 'bot')).toBeDefined();
    });
  });

  describe('位置算法（rectangle 节点上）', () => {
    it("position='top'：在 top 边界外（y 减小）", () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L', position: 'top', distance: 10 },
          },
        ],
      };
      const scene = compileToScene(ir).scene;
      const labelText = findLabel(scene.primitives, 'L')!;
      // node center 是 [0, 0]；label 视觉盒与矩形 top 边界保持 10 units 净距
      expect(labelText.y).toBeLessThan(-10);
    });

    it("position='bottom'：在 bottom 边界外（y 增大）", () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L', position: 'bottom', distance: 10 },
          },
        ],
      };
      const scene = compileToScene(ir).scene;
      const labelText = findLabel(scene.primitives, 'L')!;
      expect(labelText.y).toBeGreaterThan(10);
    });

    it("position='right'：在 right 边界外（x 增大）", () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L', position: 'right', distance: 10 },
          },
        ],
      };
      const scene = compileToScene(ir).scene;
      const labelText = findLabel(scene.primitives, 'L')!;
      expect(labelText.x).toBeGreaterThan(10);
    });

    it('数字角度 0：相当于沿 +x 方向（right）', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L', position: 0, distance: 10 },
          },
        ],
      };
      const scene = compileToScene(ir).scene;
      const labelText = findLabel(scene.primitives, 'L')!;
      expect(labelText.x).toBeGreaterThan(10);
      // right 方向（角度 0）：label 垂直居中于节点中心线 → 视觉中心 y ≈ 0
      expect(visualMiddle(labelText)).toBeCloseTo(0);
    });

    it('数字角度 90：retikz polar y 向下，相当于 bottom', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L', position: 90, distance: 10 },
          },
        ],
      };
      const scene = compileToScene(ir).scene;
      const labelText = findLabel(scene.primitives, 'L')!;
      expect(labelText.y).toBeGreaterThan(10);
    });
  });

  describe('默认值 / 缺省', () => {
    it('position 缺省 = top', () => {
      const irExplicit: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L', position: 'top' },
          },
        ],
      };
      const irDefault: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L' },
          },
        ],
      };
      const yExp = findLabel(compileToScene(irExplicit).scene.primitives, 'L')!.y;
      const yDef = findLabel(compileToScene(irDefault).scene.primitives, 'L')!.y;
      expect(yExp).toEqual(yDef);
    });

    it('distance 缺省 = 12', () => {
      const irExplicit: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L', position: 'top', distance: 12 },
          },
        ],
      };
      const irDefault: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L', position: 'top' },
          },
        ],
      };
      const yExp = findLabel(compileToScene(irExplicit).scene.primitives, 'L')!.y;
      const yDef = findLabel(compileToScene(irDefault).scene.primitives, 'L')!.y;
      expect(yExp).toEqual(yDef);
    });
  });

  describe('样式继承', () => {
    it('label.font 缺字段时从 node.font 继承', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            font: { family: 'Inter', size: 18 },
            label: { text: 'L' }, // 没指定 font
          },
        ],
      };
      const labelText = findLabel(compileToScene(ir).scene.primitives, 'L')!;
      expect(labelText.fontSize).toBeCloseTo(18);
      expect(labelText.fontFamily).toBe('Inter');
    });

    it('label.font 显式覆盖 node.font', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            font: { family: 'Inter', size: 18 },
            label: { text: 'L', font: { size: 10 } },
          },
        ],
      };
      const labelText = findLabel(compileToScene(ir).scene.primitives, 'L')!;
      expect(labelText.fontSize).toBeCloseTo(10);
      // family 仍继承
      expect(labelText.fontFamily).toBe('Inter');
    });

    it('label TextPrim 写入真实 measuredWidth', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'foo', font: { size: 20 } },
          },
        ],
      };
      const labelText = findLabel(compileToScene(ir).scene.primitives, 'foo')!;
      expect(labelText.measuredWidth).toBeCloseTo(33, 1);
    });

    it('label.textColor 缺省时继承 node.textColor', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            textColor: 'red',
            label: { text: 'L' },
          },
        ],
      };
      const labelText = findLabel(compileToScene(ir).scene.primitives, 'L')!;
      expect(labelText.fill).toBe('red');
    });
  });

  describe('与节点旋转交互', () => {
    it('rotate 节点带 label：label 与 node 一起被外层 group 旋转', () => {
      const ir: IRScene = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            rotate: 45,
            label: { text: 'L' },
          },
        ],
      };
      const scene = compileToScene(ir).scene;
      // rotate ≠ 0 时整组 wrap 进 group；label 应该在 group 内
      const top = scene.primitives;
      expect(top.some(p => p.type === 'group')).toBe(true);
      const labelText = findLabel(top, 'L');
      expect(labelText).toBeDefined();
    });
  });
});
