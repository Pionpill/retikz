import { describe, expect, it } from 'vitest';

import type {
  CompileOptions,
  CompileWarning,
  LoweredIRChild,
  LoweredIRScene,
  LoweredIRScope,
  LowerIRToKernelOptions,
  LowerTex,
  TextMeasurer,
} from '../../src';

import * as core from '../../src';

describe('core public compile exports', () => {
  it('keeps root runtime compile exports available', () => {
    expect(core.compileToScene).toBeDefined();
    expect(core.computeLayout).toBeDefined();
    expect(core.CompileWarningCode).toBeDefined();
    expect(core.lowerIRToKernel).toBeDefined();
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

    expect(options).toEqual({});
    expect(warning).toBeUndefined();
    expect(lowerTex).toBeUndefined();
    expect(measureText).toBeUndefined();
    expect(lowerOptions).toEqual({});
    expect(loweredChild).toBeUndefined();
    expect(loweredScope).toBeUndefined();
    expect(loweredScene).toBeUndefined();
  });

  it('不暴露递归 schema 注册内部能力', () => {
    expect('__registerChildSchema' in core).toBe(false);
    expect('registerRecursiveChildSchema' in core).toBe(false);
    expect('getRecursiveChildSchema' in core).toBe(false);
  });
});
