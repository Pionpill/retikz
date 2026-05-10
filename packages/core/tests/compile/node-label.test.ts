import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { ScenePrimitive, TextPrim } from '../../src/primitive';

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
      const ir: IR = {
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
      const scene = compileToScene(ir);
      const labelText = findLabel(scene.primitives, 'foo');
      expect(labelText).toBeDefined();
    });

    it('数组 label → 多个 TextPrim', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: [
              { text: 'top', position: 'above' },
              { text: 'bot', position: 'below' },
            ],
          },
        ],
      };
      const scene = compileToScene(ir);
      expect(findLabel(scene.primitives, 'top')).toBeDefined();
      expect(findLabel(scene.primitives, 'bot')).toBeDefined();
    });
  });

  describe('位置算法（rectangle 节点上）', () => {
    it("position='above'：在 north 边界外（y 减小）", () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L', position: 'above', distance: 10 },
          },
        ],
      };
      const scene = compileToScene(ir);
      const labelText = findLabel(scene.primitives, 'L')!;
      // node center 是 [0, 0]；矩形 north 边界 y < 0；label 再 -10
      expect(labelText.y).toBeLessThan(-10);
    });

    it("position='below'：在 south 边界外（y 增大）", () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L', position: 'below', distance: 10 },
          },
        ],
      };
      const scene = compileToScene(ir);
      const labelText = findLabel(scene.primitives, 'L')!;
      expect(labelText.y).toBeGreaterThan(10);
    });

    it("position='right'：在 east 边界外（x 增大）", () => {
      const ir: IR = {
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
      const scene = compileToScene(ir);
      const labelText = findLabel(scene.primitives, 'L')!;
      expect(labelText.x).toBeGreaterThan(10);
    });

    it("数字角度 0：相当于沿 +x 方向（east）", () => {
      const ir: IR = {
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
      const scene = compileToScene(ir);
      const labelText = findLabel(scene.primitives, 'L')!;
      expect(labelText.x).toBeGreaterThan(10);
      // y 接近 0 - cos(0) = 1, sin(0) = 0
      expect(labelText.y).toBeCloseTo(0);
    });

    it("数字角度 90：retikz polar y 向下，相当于 below", () => {
      const ir: IR = {
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
      const scene = compileToScene(ir);
      const labelText = findLabel(scene.primitives, 'L')!;
      expect(labelText.y).toBeGreaterThan(10);
    });
  });

  describe('默认值 / 缺省', () => {
    it('position 缺省 = above', () => {
      const irExplicit: IR = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'A',
            position: [0, 0],
            text: 'A',
            label: { text: 'L', position: 'above' },
          },
        ],
      };
      const irDefault: IR = {
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
      const yExp = findLabel(compileToScene(irExplicit).primitives, 'L')!.y;
      const yDef = findLabel(compileToScene(irDefault).primitives, 'L')!.y;
      expect(yExp).toEqual(yDef);
    });
  });

  describe('样式继承', () => {
    it('label.font 缺字段时从 node.font 继承', () => {
      const ir: IR = {
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
      const labelText = findLabel(compileToScene(ir).primitives, 'L')!;
      expect(labelText.fontSize).toBeCloseTo(18);
      expect(labelText.fontFamily).toBe('Inter');
    });

    it('label.font 显式覆盖 node.font', () => {
      const ir: IR = {
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
      const labelText = findLabel(compileToScene(ir).primitives, 'L')!;
      expect(labelText.fontSize).toBeCloseTo(10);
      // family 仍继承
      expect(labelText.fontFamily).toBe('Inter');
    });

    it('label.textColor 缺省时继承 node.textColor', () => {
      const ir: IR = {
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
      const labelText = findLabel(compileToScene(ir).primitives, 'L')!;
      expect(labelText.fill).toBe('red');
    });
  });

  describe('与节点旋转交互', () => {
    it('rotate 节点带 label：label 与 node 一起被外层 group 旋转', () => {
      const ir: IR = {
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
      const scene = compileToScene(ir);
      // rotate ≠ 0 时整组 wrap 进 group；label 应该在 group 内
      const top = scene.primitives;
      expect(top.some(p => p.type === 'group')).toBe(true);
      const labelText = findLabel(top, 'L');
      expect(labelText).toBeDefined();
    });
  });
});
