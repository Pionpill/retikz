import { describe, expect, it } from 'vitest';
import { MathContentSchema } from '../../src/ir/math';
import { NodeSchema } from '../../src/ir';

/**
 * alpha.5 ADR-01：node 公式内容 schema（MathContentSchema + IRNode.math）。
 * core 纯数据，不依赖 MathJax；渲染经注入 lowerMath（@retikz/tex）。
 */

describe('[math-schema] MathContentSchema', () => {
  it('accept：仅 tex', () => {
    expect(MathContentSchema.safeParse({ tex: '\\frac{a}{b}' }).success).toBe(true);
  });

  it('accept：tex + displayMode', () => {
    const r = MathContentSchema.safeParse({ tex: 'E=mc^2', displayMode: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ tex: 'E=mc^2', displayMode: true });
  });

  it('accept：空 tex（边界，由 compile 降级处理，schema 不拒）', () => {
    expect(MathContentSchema.safeParse({ tex: '' }).success).toBe(true);
  });

  it('reject：缺 tex', () => {
    expect(MathContentSchema.safeParse({ displayMode: false }).success).toBe(false);
  });

  it('reject：tex 非字符串', () => {
    expect(MathContentSchema.safeParse({ tex: 123 }).success).toBe(false);
  });

  it('reject：displayMode 非布尔', () => {
    expect(MathContentSchema.safeParse({ tex: 'x', displayMode: 'yes' }).success).toBe(false);
  });

  it('round-trip：JSON 往返深等', () => {
    const v = MathContentSchema.parse({ tex: '\\sum_{i=1}^n i', displayMode: true });
    expect(MathContentSchema.parse(JSON.parse(JSON.stringify(v)))).toEqual(v);
  });
});

describe('[math-schema] IRNode.math', () => {
  const baseNode = { type: 'node', id: 'eq', position: [0, 0] } as const;

  it('accept：node 带 math 内容', () => {
    const r = NodeSchema.safeParse({ ...baseNode, math: { tex: '\\frac{a}{b}' } });
    expect(r.success).toBe(true);
  });

  it('accept：node 同带 text 与 math（schema 允许；compile 决定 math 优先）', () => {
    const r = NodeSchema.safeParse({ ...baseNode, text: 'hi', math: { tex: 'x' } });
    expect(r.success).toBe(true);
  });

  it('accept：node 带 shape + math（带框公式 B 的组合形态）', () => {
    const r = NodeSchema.safeParse({ ...baseNode, shape: 'rectangle', math: { tex: 'x^2' } });
    expect(r.success).toBe(true);
  });

  it('reject：math 内非法（tex 缺失）→ strict node 整体拒', () => {
    expect(NodeSchema.safeParse({ ...baseNode, math: { displayMode: true } }).success).toBe(false);
  });

  it('round-trip：含 math 的 IRNode JSON 往返深等', () => {
    const node = NodeSchema.parse({ ...baseNode, math: { tex: 'a+b', displayMode: false } });
    expect(NodeSchema.parse(JSON.parse(JSON.stringify(node)))).toEqual(node);
  });
});
