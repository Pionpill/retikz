import { NormalizedFractionSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

import * as core from '../../src';

describe('core public compile exports', () => {
  it('keeps root runtime compile exports available', () => {
    expect('compositeOpaqueColor' in core).toBe(false);
    expect('parseStaticCssColor' in core).toBe(false);
    expect(core.compileToScene).toBeDefined();
    expect(core.computeLayout).toBeDefined();
    expect(core.resolveCoreProviderDependencies).toBeDefined();
    expect('resolveCompositeDependencies' in core).toBe(false);
    expect(core.CompileWarningCode).toBeDefined();
    expect(core.lowerIRToKernel).toBeDefined();
    expect(core.ThemeSchema).toBeDefined();
    expect('ThemeStyle' in core).toBe(false);
    expect(core.ThemeMode).toBeDefined();
    expect(core.ThemeTokenSource).toEqual({
      Inherit: 'inherit',
      Local: 'local',
    });
  });

  it('uses Foundation for shared schema primitives', () => {
    expect(NormalizedFractionSchema.parse(0.5)).toBe(0.5);
    expect('NormalizedFractionSchema' in core).toBe(false);
  });

  it('不暴露递归 schema 注册内部能力', () => {
    expect('__registerChildSchema' in core).toBe(false);
    expect('registerRecursiveChildSchema' in core).toBe(false);
    expect('getRecursiveChildSchema' in core).toBe(false);
  });
});
