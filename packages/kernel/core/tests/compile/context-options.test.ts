import { describe, expect, it } from 'vitest';

import { compileToScene, createSharedCompileContext, RetikzCoreError } from '../../src';
import type { CompileOptions } from '../../src';

describe('编译配置数值边界', () => {
  const invalidOptions: Array<CompileOptions> = [
    { padding: -1 },
    { padding: NaN },
    { padding: Infinity },
    { nodeDistance: NaN },
    { nodeDistance: -Infinity },
    { precision: -1 },
    { precision: 0.5 },
    { precision: NaN },
    { precision: Infinity },
    { precision: 309 },
    { maxCompositeDepth: -1 },
    { maxCompositeDepth: 0.5 },
    { maxCompositeDepth: NaN },
    { maxCompositeDepth: Infinity },
    { maxCompositeDepth: Number.MAX_SAFE_INTEGER + 1 },
  ];

  it.each(invalidOptions)('空场景也拒绝非法配置 %j', options => {
    expect(() => compileToScene({ type: 'scene', version: 1, children: [] }, options)).toThrow(RetikzCoreError);
  });

  it('接受零边界并保留负相对距离', () => {
    const shared = createSharedCompileContext({ padding: 0, precision: 0, nodeDistance: -12, maxCompositeDepth: 0 });
    expect(shared.layout.padding).toBe(0);
    expect(shared.layout.round(1.6)).toBe(2);
    expect(shared.layout.nodeDistance).toBe(-12);
    expect(shared.limits.maxCompositeDepth).toBe(0);
  });

  it('精度倍率的有限边界仍可舍入小坐标', () => {
    const shared = createSharedCompileContext({ precision: 308 });
    expect(shared.layout.round(0.1)).toBeCloseTo(0.1);
  });
});
