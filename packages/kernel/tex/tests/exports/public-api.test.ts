import { describe, expect, it } from 'vitest';

import * as TexApi from '../../src';
import {
  createLowerTex,
  createMathJaxEngine,
  createMathJaxLowerTex,
  MathJaxExtension,
  MathJaxProfile,
} from '../../src';
import * as ReactApi from '../../src/react';
import { useLowerTex } from '../../src/react';

describe('[exports] public API', () => {
  it('根入口与 React 子入口只导出稳定公共 API', () => {
    expect(MathJaxProfile).toEqual({ Base: 'base', Math: 'math' });
    expect(Object.values(MathJaxExtension)).toHaveLength(9);
    expect(createLowerTex).toBeTypeOf('function');
    expect(createMathJaxEngine).toBeTypeOf('function');
    expect(createMathJaxLowerTex).toBeTypeOf('function');
    expect(useLowerTex).toBeTypeOf('function');
    expect(Object.keys(TexApi).sort()).toEqual([
      'MathJaxExtension',
      'MathJaxProfile',
      'createLowerTex',
      'createMathJaxEngine',
      'createMathJaxLowerTex',
    ]);
    expect(Object.keys(ReactApi)).toEqual(['useLowerTex']);
  });
});
