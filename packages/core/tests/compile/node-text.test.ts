import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { ScenePrimitive, TextPrim } from '../../src/primitive';

const findText = (prims: Array<ScenePrimitive>): TextPrim | undefined =>
  prims.find((p): p is TextPrim => p.type === 'text');

describe('Node multi-line text (ADR-0002)', () => {
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
    expect(t1?.lines).toEqual(['Hello']);
    expect(t2?.lines).toEqual(['Hello']);
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
    expect(t?.lines).toEqual(['ab', 'longer line', 'c']);
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
});
