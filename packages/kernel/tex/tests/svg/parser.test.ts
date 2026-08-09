import { describe, expect, it } from 'vitest';

import { parseMathJaxSvg, parseMathJaxSvgResult, parsePathD } from '../../src/svg';

/**
 * SVG path-d 解析 + MathJax SVG → renderer-agnostic 字形 LoweredTex
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
    expect(r.paths[0].commands).toEqual([
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
    expect(r.paths[0].commands).toEqual([
      { kind: 'move', to: [10, 20] },
      { kind: 'line', to: [15, 20] },
    ]);
  });

  it('嵌套 translate 与 compound scale 按父矩阵 × 子矩阵复合', () => {
    const s =
      '<svg viewBox="0 0 100 100"><g transform="translate(10,20)">' +
      '<g transform="scale(2,3)"><path d="M1 2 L3 4"></path></g></g></svg>';
    const r = parseMathJaxSvg(s, 1000)!;
    expect(r.paths[0].commands).toEqual([
      { kind: 'move', to: [12, 26] },
      { kind: 'line', to: [16, 32] },
    ]);
  });

  it('compound translate + scale(1,-1) 保留负缩放方向', () => {
    const s =
      '<svg viewBox="0 0 100 100"><g transform="translate(0,10) scale(1,-1)">' +
      '<path d="M2 3 L4 5"></path></g></svg>';
    const r = parseMathJaxSvg(s, 1000)!;
    expect(r.paths[0].commands).toEqual([
      { kind: 'move', to: [2, 7] },
      { kind: 'line', to: [4, 5] },
    ]);
  });

  it('rect（分数线）→ 矩形子路径', () => {
    const s = '<svg viewBox="0 0 100 100"><g><rect x="0" y="0" width="50" height="4"></rect></g></svg>';
    const r = parseMathJaxSvg(s, 1000)!;
    expect(r.paths[0].commands.filter(c => c.kind === 'move')).toHaveLength(1);
    expect(r.paths[0].commands.some(c => c.kind === 'close')).toBe(true);
  });

  it('<defs>/<use> 解引用（fontCache local）：defs path 不直接 emit，use 引用 + 偏移', () => {
    const s =
      '<svg viewBox="0 0 100 100" xmlns:xlink="http://www.w3.org/1999/xlink">' +
      '<defs><path id="g1" d="M0 0 L10 0"></path></defs>' +
      '<g><use data-c="67" xlink:href="#g1" x="5" y="20"></use></g></svg>';
    const r = parseMathJaxSvg(s, 1000)!;
    // defs 内的 path 不直接 emit；仅经 use 解引用一次（+ x/y 偏移）
    expect(r.paths[0].commands).toEqual([
      { kind: 'move', to: [5, 20] },
      { kind: 'line', to: [15, 20] },
    ]);
  });

  it('<use> 同时应用自身 transform 与 x/y 偏移', () => {
    const s =
      '<svg viewBox="0 0 100 100" xmlns:xlink="http://www.w3.org/1999/xlink">' +
      '<defs><path id="g1" d="M0 0 L10 0"></path></defs>' +
      '<use xlink:href="#g1" x="5" y="10" transform="scale(2)"></use></svg>';
    const r = parseMathJaxSvg(s, 1000)!;
    expect(r.paths[0].commands).toEqual([
      { kind: 'move', to: [10, 20] },
      { kind: 'line', to: [30, 20] },
    ]);
  });

  it('嵌套 group 下的 <use> 按父变换 × 自身变换 × x/y 偏移复合', () => {
    const s =
      '<svg viewBox="0 0 100 100" xmlns:xlink="http://www.w3.org/1999/xlink">' +
      '<defs><path id="g1" d="M1 2 L3 4"></path></defs>' +
      '<g transform="translate(10,20)"><use xlink:href="#g1" x="5" y="7" transform="scale(2)"></use></g>' +
      '</svg>';
    const r = parseMathJaxSvg(s, 1000)!;
    expect(r.paths[0].commands).toEqual([
      { kind: 'move', to: [22, 38] },
      { kind: 'line', to: [26, 42] },
    ]);
  });

  it('无 viewBox → null', () => {
    expect(parseMathJaxSvg('<svg><path d="M0 0"></path></svg>', 14)).toBeNull();
  });

  it('合法但未支持的 transform 归为 unsupported-svg', () => {
    const s = '<svg viewBox="0 0 100 100"><g transform="rotate(90)"><path d="M0 0 L5 0"></path></g></svg>';
    expect(parseMathJaxSvgResult(s, 1000)).toMatchObject({
      ok: false,
      diagnostic: { kind: 'unsupported-svg' },
    });
  });

  it('transform 参数为 NaN 时归为 malformed-svg', () => {
    const s = '<svg viewBox="0 0 100 100"><g transform="translate(foo,20)"><path d="M0 0 L5 0"></path></g></svg>';
    expect(parseMathJaxSvgResult(s, 1000)).toMatchObject({
      ok: false,
      diagnostic: { kind: 'malformed-svg' },
    });
  });

  it('matrix transform 参数不足时返回 null', () => {
    const s = '<svg viewBox="0 0 100 100"><g transform="matrix(1 0 0)"><path d="M0 0 L5 0"></path></g></svg>';
    expect(parseMathJaxSvg(s, 1000)).toBeNull();
  });

  it('非正尺寸 viewBox → null', () => {
    expect(parseMathJaxSvg('<svg viewBox="0 0 0 0"></svg>', 14)).toBeNull();
  });
});
