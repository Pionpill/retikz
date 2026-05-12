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

  it("节点 id 类字符串原样返回（不撞 + 前缀）", () => {
    expect(parseTargetSugar('A')).toBe('A');
    expect(parseTargetSugar('A.north')).toBe('A.north');
    expect(parseTargetSugar('A.30')).toBe('A.30');
    expect(parseTargetSugar('node-1')).toBe('node-1');
  });

  it("非字符串原样返回", () => {
    expect(parseTargetSugar([10, 5])).toEqual([10, 5]);
    const polar = { angle: 30, radius: 50 };
    expect(parseTargetSugar(polar)).toEqual(polar);
    const relative = { relative: [3, 4] };
    expect(parseTargetSugar(relative)).toEqual(relative);
  });

  it("退化 / 无效字符串原样返回", () => {
    expect(parseTargetSugar('+abc')).toBe('+abc');
    expect(parseTargetSugar('+')).toBe('+');
    expect(parseTargetSugar('+1')).toBe('+1'); // 没有逗号
    expect(parseTargetSugar('+++1,0')).toBe('+++1,0'); // 三个 + 不识别
  });

  it("3 个或更多 + 都不识别（守住 +/++ 边界）", () => {
    expect(parseTargetSugar('+++1,0')).toBe('+++1,0');
    expect(parseTargetSugar('++++1,0')).toBe('++++1,0');
  });
});
