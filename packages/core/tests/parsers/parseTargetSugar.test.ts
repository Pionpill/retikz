import { describe, expect, it } from 'vitest';
import { parseTargetSugar } from '../../src/parsers/parseTargetSugar';

describe('parseTargetSugar', () => {
  it("'+1,0' → { relative: [1, 0] }", () => {
    expect(parseTargetSugar('+1,0')).toEqual({ relative: [1, 0] });
  });

  it("'++1,0' → { relativeAccumulate: [1, 0] }", () => {
    expect(parseTargetSugar('++1,0')).toEqual({ relativeAccumulate: [1, 0] });
  });

  it("浮点 + 负号：'+1.5,-2.5' / '++ -3, 4'", () => {
    expect(parseTargetSugar('+1.5,-2.5')).toEqual({ relative: [1.5, -2.5] });
    expect(parseTargetSugar('++ -3, 4')).toEqual({ relativeAccumulate: [-3, 4] });
  });

  it("节点 id 类字符串 → NodeTarget 对象（不撞 + 前缀）", () => {
    expect(parseTargetSugar('A')).toEqual({ id: 'A' });
    expect(parseTargetSugar('A.north')).toEqual({ id: 'A', anchor: 'north' });
    expect(parseTargetSugar('A.30')).toEqual({ id: 'A', anchor: 30 });
    expect(parseTargetSugar('node-1')).toEqual({ id: 'node-1' });
  });

  it("非字符串原样返回", () => {
    expect(parseTargetSugar([10, 5])).toEqual([10, 5]);
    const polar = { angle: 30, radius: 50 };
    expect(parseTargetSugar(polar)).toEqual(polar);
    const relative = { relative: [3, 4] };
    expect(parseTargetSugar(relative)).toEqual(relative);
    const nodeTarget = { id: 'A', anchor: { side: 'north', t: 0.5 } };
    expect(parseTargetSugar(nodeTarget)).toEqual(nodeTarget);
  });

  it("非 relative 的 + 串落到节点 ref（不被当 relative；守住 +/++ 边界）", () => {
    // 3+ 个 + 不是 relative shorthand → 走 parseNodeTarget → { id }（非 { relative }）
    expect(parseTargetSugar('+1')).toEqual({ id: '+1' }); // 无逗号
    expect(parseTargetSugar('+++1,0')).toEqual({ id: '+++1,0' });
    expect(parseTargetSugar('++++1,0')).toEqual({ id: '++++1,0' });
  });
});
