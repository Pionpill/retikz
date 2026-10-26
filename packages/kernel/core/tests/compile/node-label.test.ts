import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../src/compile/compile';
import type { ScenePrimitive, TextPrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

// fallback measurer 不提供 ascent / descent，Node label 规范化为上下对称视觉盒
const visualMiddle = (t: TextPrimitive): number => t.y;

/** 收集 scene 里所有 TextPrimitive（包括 group 嵌套里的） */
const collectTexts = (prims: Array<ScenePrimitive>): Array<TextPrimitive> => {
  const out: Array<TextPrimitive> = [];

  for (const p of prims) {
    if (p.type === 'text') out.push(p);
    else if (p.type === 'group') out.push(...collectTexts(p.children));
  }

  return out;
};

const findLabel = (prims: Array<ScenePrimitive>, text: string): TextPrimitive | undefined =>
  collectTexts(prims).find(t => t.lines.some(l => (typeof l === 'string' ? l : l.text) === text));

describe('Node label', () => {
  it('preserves per-line and segment styles in a multiline label', () => {
    const scene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          style: { fill: '#000000', textColor: 'contrast' },
          label: {
            position: 'center',
            opacity: 0.5,
            text: [
              { text: 'styled', fill: '#ff0000', opacity: 0.4, font: { size: 24 } },
              { segments: [{ text: 'inherited' }, { text: 'explicit', fill: '#00ff00' }] },
            ],
          },
        },
      ],
    }).scene;
    const styled = findLabel(scene.primitives, 'styled');
    const inherited = findLabel(scene.primitives, 'inherited');
    expect(styled?.fontSize).toBe(24);
    expect(styled?.fill).toBe('#ff0000');
    expect(styled?.opacity).toBeCloseTo(0.2);
    expect(inherited?.fill).toBe('#ffffff');
    expect(findLabel(scene.primitives, 'explicit')?.fill).toBe('#00ff00');
    expect(inherited!.y).toBeGreaterThan(styled!.y);
  });
  it('lays out hard line breaks as one centered label block', () => {
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [{ type: 'node', label: { text: 'first\nsecond', position: 'center', font: { size: 10 } } }],
      },
      { measureText: text => ({ width: text.length * 6, height: 10, ascent: 7, descent: 3 }) },
    ).scene;
    const first = findLabel(scene.primitives, 'first');
    const second = findLabel(scene.primitives, 'second');
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(second!.y - first!.y).toBeCloseTo(12);
    expect(first!.x + first!.measuredWidth / 2).toBeCloseTo(second!.x + second!.measuredWidth / 2);
  });
  it.each([undefined, 0, 0.4])('普通、混排标签及默认引线使用标签透明度，省略时继承节点：%s', opacity => {
    const scene = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          style: { opacity: 0.5 },
          label: [
            { text: 'plain', pin: true, ...(opacity === undefined ? {} : { opacity }) },
            {
              text: [{ segments: [{ text: 'mixed', opacity: 0.5 }] }],
              pin: { opacity: 0.7 },
              ...(opacity === undefined ? {} : { opacity }),
            },
          ],
        },
      ],
    }).scene;
    expect(findLabel(scene.primitives, 'plain')?.opacity).toBe(opacity ?? 0.5);
    expect(findLabel(scene.primitives, 'mixed')?.opacity).toBe(0.5 * (opacity ?? 0.5));
    const pins = scene.primitives.filter(primitive => primitive.type === 'path');
    expect(pins.map(pin => pin.opacity)).toEqual([opacity ?? 0.5, 0.7]);
  });

  describe('基本生成', () => {
    it('单对象 label → 一个 TextPrimitive', () => {
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

    it('数组 label → 多个 TextPrimitive', () => {
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
            label: { text: 'L' },
            style: { font: { family: 'Inter', size: 18 } },
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
            label: { text: 'L', font: { size: 10 } },
            style: { font: { family: 'Inter', size: 18 } },
          },
        ],
      };
      const labelText = findLabel(compileToScene(ir).scene.primitives, 'L')!;

      expect(labelText.fontSize).toBeCloseTo(10);

      // family 仍继承
      expect(labelText.fontFamily).toBe('Inter');
    });

    it('label TextPrimitive 写入真实 measuredWidth', () => {
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
            label: { text: 'L' },
            style: { textColor: 'red' },
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
