import { describe, expect, it } from 'vitest';

import { parseMathJaxSvg } from '../src/svg/parse-svg';
import { parsePathD } from '../src/svg/path-d';

/**
 * alpha.5 ADR-01：SVG path-d 解析 + MathJax SVG → 字形 LoweredMath。
 */

describe('[path-d] parsePathD', () => {
  it('M/L/Z 绝对', () => {
    expect(parsePathD('M0 0 L10 0 L10 10 Z')).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [10, 10] },
      { kind: 'close' },
    ]);
  });

  it('H/V → line', () => {
    expect(parsePathD('M0 0 H10 V10')).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [10, 10] },
    ]);
  });

  it('Q + T（T 反射控制点）', () => {
    const cmds = parsePathD('M0 0 Q5 10 10 0 T20 0');
    expect(cmds[0]).toEqual({ kind: 'move', to: [0, 0] });
    expect(cmds[1]).toEqual({ kind: 'quad', control: [5, 10], to: [10, 0] });
    // T 反射：control = 2*current(10,0) - lastCtrl(5,10) = (15,-10)
    expect(cmds[2]).toEqual({ kind: 'quad', control: [15, -10], to: [20, 0] });
  });

  it('C 三次贝塞尔', () => {
    expect(parsePathD('M0 0 C1 2 3 4 5 6')).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'cubic', control1: [1, 2], control2: [3, 4], to: [5, 6] },
    ]);
  });

  it('相对 m/l 累加', () => {
    expect(parsePathD('m1 1 l2 0')).toEqual([
      { kind: 'move', to: [1, 1] },
      { kind: 'line', to: [3, 1] },
    ]);
  });

  it('隐式 lineto（M 后多坐标对）', () => {
    expect(parsePathD('M0 0 1 1 2 2')).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [1, 1] },
      { kind: 'line', to: [2, 2] },
    ]);
  });

  it('不支持的弧 A → 抛错', () => {
    expect(() => parsePathD('M0 0 A1 1 0 0 1 10 10')).toThrow();
  });
});

describe('[parse-svg] parseMathJaxSvg', () => {
  // 已知 viewBox + 全局 scale(1,-1) 翻转 + path；fontSize=1000 → scale=1，便于核对坐标
  const svg =
    '<svg viewBox="0 -100 200 150"><g transform="scale(1,-1)">' +
    '<path d="M0 100 L200 100 L200 -50 Z"></path></g></svg>';

  it('坐标：scale(1,-1) 翻转 + viewBox 归一到左上原点 y-down', () => {
    const r = parseMathJaxSvg(svg, 1000)!;
    expect(r.commands).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [200, 0] },
      { kind: 'line', to: [200, 150] },
      { kind: 'close' },
    ]);
  });

  it('bbox：width/height = viewBox×scale，depth = (vbY+vbH)×scale', () => {
    const r = parseMathJaxSvg(svg, 1000)!;
    expect(r.width).toBe(200);
    expect(r.height).toBe(150);
    expect(r.depth).toBe(50);
  });

  it('fontSize 缩放：fontSize=500 → 尺寸减半', () => {
    const r = parseMathJaxSvg(svg, 500)!;
    expect(r.width).toBe(100);
    expect(r.height).toBe(75);
  });

  it('嵌套 translate 字形偏移累积', () => {
    const s = '<svg viewBox="0 0 100 100"><g transform="translate(10,20)">' + '<path d="M0 0 L5 0"></path></g></svg>';
    const r = parseMathJaxSvg(s, 1000)!;
    expect(r.commands).toEqual([
      { kind: 'move', to: [10, 20] },
      { kind: 'line', to: [15, 20] },
    ]);
  });

  it('rect（分数线）→ 矩形子路径', () => {
    const s = '<svg viewBox="0 0 100 100"><g><rect x="0" y="0" width="50" height="4"></rect></g></svg>';
    const r = parseMathJaxSvg(s, 1000)!;
    expect(r.commands.filter(c => c.kind === 'move')).toHaveLength(1);
    expect(r.commands.some(c => c.kind === 'close')).toBe(true);
  });

  it('<defs>/<use> 解引用（fontCache local）：defs path 不直接 emit，use 引用 + 偏移', () => {
    const s =
      '<svg viewBox="0 0 100 100" xmlns:xlink="http://www.w3.org/1999/xlink">' +
      '<defs><path id="g1" d="M0 0 L10 0"></path></defs>' +
      '<g><use data-c="67" xlink:href="#g1" x="5" y="20"></use></g></svg>';
    const r = parseMathJaxSvg(s, 1000)!;
    // defs 内的 path 不直接 emit；仅经 use 解引用一次（+ x/y 偏移）
    expect(r.commands).toEqual([
      { kind: 'move', to: [5, 20] },
      { kind: 'line', to: [15, 20] },
    ]);
  });

  it('无 viewBox → null', () => {
    expect(parseMathJaxSvg('<svg><path d="M0 0"></path></svg>', 14)).toBeNull();
  });

  it('空（无 path）→ 合法零尺寸结果（非 null）', () => {
    const r = parseMathJaxSvg('<svg viewBox="0 0 0 0"></svg>', 14);
    expect(r).not.toBeNull();
    expect(r!.commands).toEqual([]);
  });
});
