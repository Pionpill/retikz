import { describe, expect, it } from 'vitest';
import { compileToScene, SceneSchema } from '@retikz/core';
import { scoreL2 } from '../../src/score/l2';

const ir = SceneSchema.parse({
  version: 1,
  type: 'scene',
  children: [{ type: 'node', position: [0, 0], text: 'Hello', shape: 'rectangle' }],
});
const scene = compileToScene(ir);

describe('scoreL2', () => {
  it('全部断言通过 → total=passed', () => {
    const r = scoreL2(scene, [
      { kind: 'textPresent', text: 'Hello' },
      { kind: 'primitiveCount', primitive: 'rect', op: '>=', value: 1 },
    ]);
    expect(r.total).toBe(2);
    expect(r.passed).toBe(2);
  });
  it('部分失败 → passed < total', () => {
    const r = scoreL2(scene, [{ kind: 'textPresent', text: '不存在' }]);
    expect(r.total).toBe(1);
    expect(r.passed).toBe(0);
    expect(r.results[0]?.pass).toBe(false);
  });
});
