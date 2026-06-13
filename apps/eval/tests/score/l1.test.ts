import { describe, expect, it } from 'vitest';
import { scoreL1 } from '../../src/score/l1';

const emptyScene = { version: 1, type: 'scene', children: [] };
const nodeScene = {
  version: 1,
  type: 'scene',
  children: [{ type: 'node', position: [0, 0], text: 'Hello' }],
};

describe('scoreL1', () => {
  it('空场景：zod 与 compile 双通过', () => {
    const r = scoreL1(emptyScene);
    expect(r.zodOk).toBe(true);
    expect(r.compileOk).toBe(true);
    expect(r.failure).toBeUndefined();
  });

  it('含一个 node 的场景：双通过', () => {
    const r = scoreL1(nodeScene);
    expect(r.zodOk).toBe(true);
    expect(r.compileOk).toBe(true);
  });

  it('version 错误：zod 失败、不再尝试 compile', () => {
    const r = scoreL1({ version: 2, type: 'scene', children: [] });
    expect(r.zodOk).toBe(false);
    expect(r.compileOk).toBe(false);
    expect(r.failure?.stage).toBe('zod');
    expect(r.failure?.reason).toBeTruthy();
  });

  it('null / 非对象：zod 失败', () => {
    expect(scoreL1(null).zodOk).toBe(false);
    expect(scoreL1('nope').zodOk).toBe(false);
  });
});
