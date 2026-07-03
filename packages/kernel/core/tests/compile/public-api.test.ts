import { describe, expect, it } from 'vitest';

import type { CompileOptions, CompileWarning, LowerTex, TextMeasurer } from '../../src';

import * as core from '../../src';

describe('core public compile exports', () => {
  it('keeps root runtime compile exports available', () => {
    expect(core.compileToScene).toBeDefined();
    expect(core.computeLayout).toBeDefined();
    expect(core.CompileWarningCode).toBeDefined();
  });

  it('keeps root compile types available', () => {
    const options: CompileOptions = {};
    const warning: CompileWarning | undefined = undefined;
    const lowerTex: LowerTex | undefined = undefined;
    const measureText: TextMeasurer | undefined = undefined;

    expect(options).toEqual({});
    expect(warning).toBeUndefined();
    expect(lowerTex).toBeUndefined();
    expect(measureText).toBeUndefined();
  });
});
