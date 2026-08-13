import type * as Foundation from '@retikz/foundation';

import { NormalizedFractionSchema } from '@retikz/foundation';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  CompileOptions,
  CompileWarning,
  IRTheme,
  LoweredIRChild,
  LoweredIRScene,
  LoweredIRScope,
  LowerIRToKernelOptions,
  LowerTex,
  ResolvedTheme,
  TextMeasurer,
  ThemeModeValue,
  ThemeStyleValue,
  ThemeTokenSourceValue,
} from '../../src';
// @ts-expect-error Core no longer owns the shared ValueOf type utility
import type { ValueOf } from '../../src';
// @ts-expect-error Core no longer owns the shared AssertEqual type utility
import type { AssertEqual } from '../../src';

type RemovedCoreValueOf<T extends object> = ValueOf<T>;
type RemovedCoreAssertEqual<TActual, TExpected> = AssertEqual<TActual, TExpected>;

import * as core from '../../src';

describe('core public compile exports', () => {
  it('keeps root runtime compile exports available', () => {
    expect(core.compileToScene).toBeDefined();
    expect(core.computeLayout).toBeDefined();
    expect(core.resolveCompositeDependencies).toBeDefined();
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

  it('keeps root compile types available', () => {
    const options: CompileOptions = {};
    const warning: CompileWarning | undefined = undefined;
    const lowerTex: LowerTex | undefined = undefined;
    const measureText: TextMeasurer | undefined = undefined;
    const lowerOptions: LowerIRToKernelOptions = {};
    const loweredChild: LoweredIRChild | undefined = undefined;
    const loweredScope: LoweredIRScope | undefined = undefined;
    const loweredScene: LoweredIRScene | undefined = undefined;
    const theme: IRTheme = { style: 'clean' };
    const resolvedTheme: ResolvedTheme = {
      style: 'clean',
      mode: 'dark',
      colors: {
        semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706' },
        categorical: ['#2563eb'],
      },
    };
    const style: ThemeStyleValue = 'clean';
    const mode: ThemeModeValue = 'dark';
    const source: ThemeTokenSourceValue = core.ThemeTokenSource.Inherit;

    expect(options).toEqual({});
    expect(warning).toBeUndefined();
    expect(lowerTex).toBeUndefined();
    expect(measureText).toBeUndefined();
    expect(lowerOptions).toEqual({});
    expect(loweredChild).toBeUndefined();
    expect(loweredScope).toBeUndefined();
    expect(loweredScene).toBeUndefined();
    expect(theme).toEqual({ style: 'clean' });
    expect(source).toBe('inherit');
    expect(resolvedTheme).toEqual({
      style,
      mode,
      colors: {
        semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706' },
        categorical: ['#2563eb'],
      },
    });
  });

  it('uses Foundation for shared type utilities', () => {
    expectTypeOf<Foundation.ValueOf<{ Alpha: 'a' }>>().toEqualTypeOf<'a'>();
    expectTypeOf<Foundation.AssertEqual<'a', 'a'>>().toEqualTypeOf<true>();
    void ({} as Foundation.OpenString<'a'>);
    void ({} as RemovedCoreValueOf<{ Alpha: 'a' }>);
    void ({} as RemovedCoreAssertEqual<'a', 'a'>);
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
