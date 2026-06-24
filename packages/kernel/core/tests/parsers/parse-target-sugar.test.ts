import { describe, expect, it } from 'vitest';
import { parseTargetSugar } from '../../src/parsers/target-sugar';

describe('parseTargetSugar', () => {
  it("'+1,0' 解析为 relative", () => {
    expect(parseTargetSugar('+1,0')).toEqual({ relative: [1, 0] });
  });

  it("'++1,0' 解析为 relativeAccumulate", () => {
    expect(parseTargetSugar('++1,0')).toEqual({ relativeAccumulate: [1, 0] });
  });

  it('支持小数和负号', () => {
    expect(parseTargetSugar('+1.5,-2.5')).toEqual({ relative: [1.5, -2.5] });
    expect(parseTargetSugar('++ -3, 4')).toEqual({ relativeAccumulate: [-3, 4] });
  });

  it('支持省略整数位的小数和科学计数法', () => {
    expect(parseTargetSugar('+1,.5')).toEqual({ relative: [1, 0.5] });
    expect(parseTargetSugar('+.5,1')).toEqual({ relative: [0.5, 1] });
    expect(parseTargetSugar('++ -.5, 1e2')).toEqual({ relativeAccumulate: [-0.5, 100] });
    expect(parseTargetSugar('+1e2,2')).toEqual({ relative: [100, 2] });
  });

  it('节点 id 类字符串解析为 NodeTarget 对象', () => {
    expect(parseTargetSugar('A')).toEqual({ id: 'A' });
    expect(parseTargetSugar('A.north')).toEqual({ id: 'A', anchor: 'north' });
    expect(parseTargetSugar('A.30')).toEqual({ id: 'A', anchor: 30 });
    expect(parseTargetSugar('node-1')).toEqual({ id: 'node-1' });
  });

  it('非字符串原样返回', () => {
    expect(parseTargetSugar([10, 5])).toEqual([10, 5]);
    const polar = { angle: 30, radius: 50 };
    expect(parseTargetSugar(polar)).toEqual(polar);
    const relative = { relative: [3, 4] };
    expect(parseTargetSugar(relative)).toEqual(relative);
    const nodeTarget = { id: 'A', anchor: { side: 'north', t: 0.5 } };
    expect(parseTargetSugar(nodeTarget)).toEqual(nodeTarget);
  });

  it('无逗号的 + 串仍可作为节点 id，有逗号的错误相对偏移直接报错', () => {
    expect(parseTargetSugar('+1')).toEqual({ id: '+1' });
    expect(() => parseTargetSugar('+++1,0')).toThrow(/invalid relative offset/);
    expect(() => parseTargetSugar('++++1,0')).toThrow(/invalid relative offset/);
  });
});
