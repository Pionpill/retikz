/**
 * Node maxTextWidth 自动换行（alpha.7 ADR-02）
 * @description 折行阈值语义：盒宽 = min(实际最长行, maxTextWidth)，短文本收缩。
 *   西文按词、CJK 按字；折出物理行继承逻辑行 LineSpec 样式；长不可断 token 溢出不硬断。
 *   用确定性 measureText（width = 字符数）让断点可精确断言。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { CompileOptions } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { ScenePrimitive, TextPrim } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const findText = (prims: Array<ScenePrimitive>): TextPrim | undefined =>
  flattenPrims(prims).find((p): p is TextPrim => p.type === 'text');

/** width = 字符数（与字号无关），便于精确断言折行 */
const opts: CompileOptions = { measureText: text => ({ width: [...text].length, height: 14 }) };

const compileNode = (node: Record<string, unknown>): TextPrim => {
  const ir: IR = { version: 1, type: 'scene', children: [{ type: 'node', id: 'A', position: [0, 0], ...node }] as never };
  const t = findText(compileToScene(ir, opts).primitives);
  if (!t) throw new Error('expected TextPrim');
  return t;
};

describe('maxTextWidth 西文按词折行', () => {
  it('"aaa bbb ccc" + maxTextWidth=7 → ["aaa bbb", "ccc"]', () => {
    const t = compileNode({ text: 'aaa bbb ccc', maxTextWidth: 7 });
    expect(t.lines.map(l => l.text)).toEqual(['aaa bbb', 'ccc']);
  });
});

describe('maxTextWidth CJK 按字折行', () => {
  it('"中文换行测试" + maxTextWidth=3 → ["中文换", "行测试"]', () => {
    const t = compileNode({ text: '中文换行测试', maxTextWidth: 3 });
    expect(t.lines.map(l => l.text)).toEqual(['中文换', '行测试']);
  });
});

describe('maxTextWidth 短文本盒收缩', () => {
  it('"ab" + maxTextWidth=100 → 单行、measuredWidth=2（不撑满）', () => {
    const t = compileNode({ text: 'ab', maxTextWidth: 100 });
    expect(t.lines.map(l => l.text)).toEqual(['ab']);
    expect(t.measuredWidth).toBe(2);
  });
});

describe('未给 maxTextWidth 行为不变', () => {
  it('"aaa bbb ccc" 无 maxTextWidth → 单行', () => {
    const t = compileNode({ text: 'aaa bbb ccc' });
    expect(t.lines.map(l => l.text)).toEqual(['aaa bbb ccc']);
  });
});

describe('折出物理行继承 LineSpec 样式', () => {
  it('[{text:"aaa bbb", fill:"red"}] + maxTextWidth=3 → ["aaa","bbb"] 均 fill red', () => {
    const t = compileNode({ text: [{ text: 'aaa bbb', fill: 'red' }], maxTextWidth: 3 });
    expect(t.lines.map(l => ({ text: l.text, fill: l.fill }))).toEqual([
      { text: 'aaa', fill: 'red' },
      { text: 'bbb', fill: 'red' },
    ]);
  });
});

describe('长不可断 token 溢出不硬断', () => {
  it('"abcdefgh"（单词 8 字符）+ maxTextWidth=3 → 单行溢出', () => {
    const t = compileNode({ text: 'abcdefgh', maxTextWidth: 3 });
    expect(t.lines.map(l => l.text)).toEqual(['abcdefgh']);
  });
});
