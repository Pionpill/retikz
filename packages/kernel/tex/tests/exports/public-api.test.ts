import { describe, expect, it } from 'vitest';

import * as TexApi from '../../src';
import {
  createLowerTex,
  createMathJaxEngine,
  createMathJaxLowerTex,
  MathJaxExtension,
  MathJaxProfile,
} from '../../src';
import { useLowerTex } from '../../src/react';

describe('[exports] public API', () => {
  it('根入口与 React 子入口导出 ADR-06 API', () => {
    expect(MathJaxProfile).toEqual({ Base: 'base', Math: 'math' });
    expect(Object.values(MathJaxExtension)).toHaveLength(9);
    expect(createLowerTex).toBeTypeOf('function');
    expect(createMathJaxEngine).toBeTypeOf('function');
    expect(createMathJaxLowerTex).toBeTypeOf('function');
    expect(useLowerTex).toBeTypeOf('function');
  });

  it('根入口不暴露 engine canonicalization 与内部 lowering result', () => {
    expect(TexApi).not.toHaveProperty('loadMathJaxConfigurations');
    expect(TexApi).not.toHaveProperty('resolveMathJaxEngineOptions');
    expect(TexApi).not.toHaveProperty('MATHJAX_EXTENSION_ORDER');
    expect(TexApi).not.toHaveProperty('MATHJAX_MATH_EXTENSIONS');
  });
});
