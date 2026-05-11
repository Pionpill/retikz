import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { ScenePrimitive, TextPrim } from '../../src/primitive';

const findText = (prims: Array<ScenePrimitive>): TextPrim | undefined =>
  prims.find((p): p is TextPrim => p.type === 'text');

describe('Node multi-line text', () => {
  it("text: 'Hello' 与 text: ['Hello'] 编译产出相同 lines", () => {
    const single: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'Hello' }],
    };
    const arr: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: ['Hello'] }],
    };
    const t1 = findText(compileToScene(single).primitives);
    const t2 = findText(compileToScene(arr).primitives);
    expect(t1?.lines).toEqual([{ text: 'Hello' }]);
    expect(t2?.lines).toEqual([{ text: 'Hello' }]);
    expect(t1?.measuredWidth).toBe(t2?.measuredWidth);
    expect(t1?.measuredHeight).toBe(t2?.measuredHeight);
  });

  it("多行 text 的 measuredWidth = max(per-line width)，height = lines × lineHeight", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: ['ab', 'longer line', 'c'],
        },
      ],
    };
    const t = findText(compileToScene(ir).primitives);
    expect(t?.lines).toEqual([
      { text: 'ab' },
      { text: 'longer line' },
      { text: 'c' },
    ]);
    // fallback measurer: width = text.length × 14 × 0.55；'longer line' 11 字符 → 84.7
    // 多行高度 = 3 × (14 × 1.2) = 50.4
    expect(t?.measuredWidth).toBeCloseTo(84.7, 1);
    expect(t?.measuredHeight).toBeCloseTo(50.4, 1);
  });

  it("align='left' → TextPrim.align='start' 且 x 偏到块左边", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [100, 0],
          text: ['line one', 'line two'],
          align: 'left',
        },
      ],
    };
    const t = findText(compileToScene(ir).primitives);
    expect(t?.align).toBe('start');
    // align=left 时 TextPrim.x = center.x - blockHalfWidth
    expect(t!.x).toBeLessThan(100);
  });

  it("align='right' → TextPrim.align='end' 且 x 偏到块右边", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [100, 0],
          text: ['ab', 'cdefg'],
          align: 'right',
        },
      ],
    };
    const t = findText(compileToScene(ir).primitives);
    expect(t?.align).toBe('end');
    expect(t!.x).toBeGreaterThan(100);
  });

  it("默认 align='center' → TextPrim.align='middle' 且 x = node 中心", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [50, 50], text: ['hi', 'there'] },
      ],
    };
    const t = findText(compileToScene(ir).primitives);
    expect(t?.align).toBe('middle');
    expect(t?.x).toBe(50);
  });

  it("lineHeight 默认 = font.size × 1.2", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: ['x', 'y'],
          font: { size: 20 },
        },
      ],
    };
    const t = findText(compileToScene(ir).primitives);
    expect(t?.lineHeight).toBeCloseTo(20 * 1.2, 1);
  });

  it("lineHeight 显式覆盖 font.size × 1.2 默认", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: ['x', 'y'],
          lineHeight: 30,
        },
      ],
    };
    const t = findText(compileToScene(ir).primitives);
    expect(t?.lineHeight).toBe(30);
  });

  it("多行节点 height 大于单行节点 height（外接 bbox 跟着 textHeight 长）", () => {
    const single: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'a' }],
    };
    const multi: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: ['a', 'b', 'c'] },
      ],
    };
    const r1 = compileToScene(single).primitives.find(p => p.type === 'rect');
    const r3 = compileToScene(multi).primitives.find(p => p.type === 'rect');
    if (r1?.type === 'rect' && r3?.type === 'rect') {
      expect(r3.height).toBeGreaterThan(r1.height);
    }
  });

  it("不传 text 时不 emit TextPrim（保留 alpha.1 行为）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0] }],
    };
    expect(findText(compileToScene(ir).primitives)).toBeUndefined();
  });

  it("行级 LineSpec 对象可覆盖 fill / opacity（emit 写入对应字段）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          text: [
            { text: 'red', fill: 'red' },
            { text: 'half', opacity: 0.5 },
            'plain',
          ],
        },
      ],
    };
    const t = findText(compileToScene(ir).primitives);
    expect(t?.lines).toEqual([
      { text: 'red', fill: 'red' },
      { text: 'half', opacity: 0.5 },
      { text: 'plain' },
    ]);
  });

  it("行级 font 部分覆盖：未填字段不写入（让下游走块级默认）", () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          font: { size: 12, family: 'monospace' },
          text: [
            { text: 'big', font: { size: 20, weight: 'bold' } },
            'normal',
          ],
        },
      ],
    };
    const t = findText(compileToScene(ir).primitives);
    expect(t?.lines[0]).toEqual({
      text: 'big',
      fontSize: 20,
      fontWeight: 'bold',
    });
    // 第二行无任何覆盖
    expect(t?.lines[1]).toEqual({ text: 'normal' });
    // 块级默认仍写在 TextPrim 顶层
    expect(t?.fontSize).toBe(12);
    expect(t?.fontFamily).toBe('monospace');
  });

  it("行级 font.size 影响该行宽度度量（max 取所有行）", () => {
    // 同样字符数，行级大字号那行胜出 max 宽度
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          font: { size: 10 },
          text: [
            'aaaa', // 10 × 4 × 0.55 = 22
            { text: 'aaaa', font: { size: 30 } }, // 30 × 4 × 0.55 = 66
          ],
        },
      ],
    };
    const t = findText(compileToScene(ir).primitives);
    expect(t?.measuredWidth).toBeCloseTo(66, 0);
  });
});
