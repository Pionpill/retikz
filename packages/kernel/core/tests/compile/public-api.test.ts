import { NormalizedFractionSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

import * as core from '../../src';

describe('核心公共编译导出', () => {
  it('保持根运行时编译导出可用', () => {
    expect('compositeOpaqueColor' in core).toBe(false);
    expect('parseStaticCssColor' in core).toBe(false);
    expect(core.compileToScene).toBeDefined();
    expect(core.computeLayout).toBeDefined();
    expect(core.resolveCoreProviderDependencies).toBeDefined();
    expect('resolveCompositeDependencies' in core).toBe(false);
    expect(core.BuiltinCompileWarningCode).toBeDefined();
    expect(core.ThemeSchema).toBeDefined();
    expect('Theme' in core).toBe(false);
    expect(core.ThemeMode).toBeDefined();
    expect(core.ThemeTokenSource).toEqual({
      Inherit: 'inherit',
      Local: 'local',
    });
  });

  it('使用 Foundation 来共享 schema 基元', () => {
    expect(NormalizedFractionSchema.parse(0.5)).toBe(0.5);
    expect('NormalizedFractionSchema' in core).toBe(false);
  });

  it('不暴露递归 schema 注册内部能力', () => {
    expect('__registerChildSchema' in core).toBe(false);
    expect('registerRecursiveChildSchema' in core).toBe(false);
    expect('getRecursiveChildSchema' in core).toBe(false);
  });
});
