import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  ComponentPreviewFile,
  ComponentPreviewFiles,
} from '../../src/modules/docs/components/component-preview/types';

import { normalizeComponentPreviewFiles } from '../../src/modules/docs/components/component-preview/utils/preview-files';

describe('ComponentPreview files 配置', () => {
  it('暴露 files 归一化函数', () => {
    expect(normalizeComponentPreviewFiles).toBeTypeOf('function');
  });

  it('将 string 规范化为无 baseline 和附加文件的主 demo', () => {
    expect(normalizeComponentPreviewFiles('line-basic')).toEqual({
      name: 'line-basic',
      sourceFiles: [],
    });
  });

  it('将单个对象规范化为带 baseline 的主 demo', () => {
    expect(
      normalizeComponentPreviewFiles({
        file: 'learning-path-02-spine',
        diffFrom: 'learning-path-01-title',
      }),
    ).toEqual({
      name: 'learning-path-02-spine',
      diffFrom: 'learning-path-01-title',
      sourceFiles: [],
    });
  });

  it('将非空 tuple 的第一项作为主 demo，其余项复制为附加文件', () => {
    const files = [
      { file: 'ohms-law-circuit-04-measurement-cells', diffFrom: 'ohms-law-circuit-03-placement' },
      'circuitShapes.tsx',
      { file: 'circuit-01-meters.meter.tsx', diffFrom: 'circuit-00-base.meter.tsx' },
    ] as const satisfies ComponentPreviewFiles;

    const normalized = normalizeComponentPreviewFiles(files);

    expect(normalized).toEqual({
      name: 'ohms-law-circuit-04-measurement-cells',
      diffFrom: 'ohms-law-circuit-03-placement',
      sourceFiles: [
        { file: 'circuitShapes.tsx' },
        { file: 'circuit-01-meters.meter.tsx', diffFrom: 'circuit-00-base.meter.tsx' },
      ],
    });
    expect(normalized.sourceFiles).not.toBe(files);
  });

  it('将字符串 tuple 的第一项作为主 demo，其余项规范化为附加文件', () => {
    const files = ['plot-coordinate', 'plot-cartesian.data.ts'] as const;

    expect(normalizeComponentPreviewFiles(files)).toEqual({
      name: 'plot-coordinate',
      sourceFiles: [{ file: 'plot-cartesian.data.ts' }],
    });
  });

  it('允许字符串与带 diffFrom 的对象配置混用', () => {
    const files = [
      { file: 'learning-path-02-spine', diffFrom: 'learning-path-01-title' },
      'learning-path.data.ts',
    ] as const;

    expect(normalizeComponentPreviewFiles(files)).toEqual({
      name: 'learning-path-02-spine',
      diffFrom: 'learning-path-01-title',
      sourceFiles: [{ file: 'learning-path.data.ts' }],
    });
  });

  it('公开类型接受三种输入并拒绝空 tuple', () => {
    expectTypeOf<string>().toMatchTypeOf<ComponentPreviewFiles>();
    expectTypeOf<ComponentPreviewFile>().toMatchTypeOf<ComponentPreviewFiles>();
    expectTypeOf<readonly [ComponentPreviewFile]>().toMatchTypeOf<ComponentPreviewFiles>();
    expectTypeOf<readonly [string, string]>().toMatchTypeOf<ComponentPreviewFiles>();
    expectTypeOf<readonly []>().not.toMatchTypeOf<ComponentPreviewFiles>();
  });
});
