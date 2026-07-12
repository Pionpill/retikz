import type { IRScene } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { describe, expect, it } from 'vitest';

import { buildPreviewSource } from '../../src/modules/docs/components/component-preview/source-panel';
import { buildPreviewIR, formatIR, irHasAnimations } from '../../src/modules/docs/components/component-preview/utils';

const StaticDemo: FC = () => (
  <Layout width={40} height={20}>
    <Node id="box" position={[0, 0]}>
      A
    </Node>
  </Layout>
);

const AlternateDemo: FC = () => (
  <Layout width={80} height={30}>
    <Node id="alternate" position={[10, 5]}>
      B
    </Node>
  </Layout>
);

const staticIR = buildPreviewIR(StaticDemo).ir;
const alternateIR = buildPreviewIR(AlternateDemo).ir;

const createInput = (overrides: Record<string, unknown> = {}) => ({
  Component: StaticDemo,
  name: 'demo',
  key: '../../contents/test/demo.demo.tsx',
  segments: ['test'],
  rawSource: 'export default Demo;\n',
  sourceFiles: [],
  hideCode: false,
  ...overrides,
});

describe('buildPreviewSource', () => {
  it('默认从静态 demo 派生 React、IR 与 Vanilla 源码', () => {
    const result = buildPreviewSource(createInput());

    expect(result.previewIr?.ir).toEqual(staticIR);
    expect(result.source?.react?.files[0]?.code).toBe('export default Demo;');
    expect(result.source?.ir?.files[0]?.code).toBe(formatIR(staticIR));
    expect(result.source?.vanilla?.files[0]?.code).toContain("from '@retikz/vanilla'");
  });

  it('deriveIR false 时不执行 demo 并保持 React-only', () => {
    let executions = 0;
    const ThrowingDemo: FC = () => {
      executions++;
      throw new Error('must not execute');
    };

    const result = buildPreviewSource(createInput({ Component: ThrowingDemo, previewSource: { deriveIR: false } }));

    expect(executions).toBe(0);
    expect(result.previewIr).toBeNull();
    expect(result.source?.react).toBeDefined();
    expect(result.source?.ir).toBeUndefined();
    expect(result.source?.vanilla).toBeUndefined();
  });

  it('hideCode 时不执行 demo 也不构造源码', () => {
    let executions = 0;
    const ThrowingDemo: FC = () => {
      executions++;
      throw new Error('must not execute');
    };

    const result = buildPreviewSource(createInput({ Component: ThrowingDemo, hideCode: true }));

    expect(executions).toBe(0);
    expect(result).toEqual({ source: undefined, previewIr: null });
  });

  it('irJsonOverride 优先于模块导出和自动派生', () => {
    let executions = 0;
    const ThrowingDemo: FC = () => {
      executions++;
      throw new Error('must not execute');
    };
    const irJsonOverride = formatIR(alternateIR);

    const result = buildPreviewSource(
      createInput({ Component: ThrowingDemo, irJsonOverride, exportedPreviewIR: staticIR }),
    );

    expect(executions).toBe(0);
    expect(result.previewIr?.ir).toEqual(alternateIR);
    expect(result.source?.ir?.files[0]?.code).toBe(irJsonOverride);
  });

  it('previewIR 优先于自动派生', () => {
    let executions = 0;
    const ThrowingDemo: FC = () => {
      executions++;
      throw new Error('must not execute');
    };

    const result = buildPreviewSource(createInput({ Component: ThrowingDemo, exportedPreviewIR: alternateIR }));

    expect(executions).toBe(0);
    expect(result.previewIr?.ir).toEqual(alternateIR);
  });

  it('deriveIR false 时仍从 previewIR 生成 IR 与 Vanilla', () => {
    const result = buildPreviewSource(createInput({ previewSource: { deriveIR: false }, exportedPreviewIR: staticIR }));

    expect(result.previewIr?.ir).toEqual(staticIR);
    expect(result.source?.ir).toBeDefined();
    expect(result.source?.vanilla?.files[0]?.code).toContain("from '@retikz/vanilla'");
  });

  it('自动派生失败时保留 React 和 IR 诊断但不生成 Vanilla', () => {
    const ThrowingDemo: FC = () => {
      throw new Error('derive failed');
    };

    const result = buildPreviewSource(createInput({ Component: ThrowingDemo }));

    expect(result.previewIr).toBeNull();
    expect(result.source?.react).toBeDefined();
    expect(result.source?.ir?.files[0]?.code).toContain('// Failed to compute IR: derive failed');
    expect(result.source?.vanilla).toBeUndefined();
  });

  it('vanillaOverride 优先于 IR codegen', () => {
    const result = buildPreviewSource(createInput({ vanillaOverride: 'export const figure = custom();\n' }));

    expect(result.source?.vanilla?.files[0]?.code).toBe('export const figure = custom();');
  });

  it('composite IR 不生成 Vanilla', () => {
    const compositeIR = {
      type: 'scene',
      version: 1,
      children: [{ namespace: 'plot', type: 'demo' }],
    } as IRScene;
    const result = buildPreviewSource(createInput({ exportedPreviewIR: compositeIR }));

    expect(result.previewIr?.ir).toEqual(compositeIR);
    expect(result.source?.ir).toBeDefined();
    expect(result.source?.vanilla).toBeUndefined();
  });

  it('结构非法但可解析的 IR 只保留源码诊断并阻断宿主消费', () => {
    const malformedIR = {} as IRScene;
    const result = buildPreviewSource(createInput({ exportedPreviewIR: malformedIR }));

    expect(result.source?.react).toBeDefined();
    expect(result.source?.ir?.files[0]?.code).toBe(formatIR(malformedIR));
    expect(result.source?.vanilla?.files[0]?.code).toContain('// Failed to generate vanilla code:');
    expect(result.previewIr).toBeNull();
    expect(() => result.previewIr !== null && irHasAnimations(result.previewIr.ir)).not.toThrow();
  });

  it('嵌套子项非法的显式 IR 不进入 renderer 与宿主消费', () => {
    const malformedIR = {
      type: 'scene',
      version: 1,
      children: [null],
    } as unknown as IRScene;
    const result = buildPreviewSource(createInput({ exportedPreviewIR: malformedIR }));

    expect(result.source?.ir?.files[0]?.code).toBe(formatIR(malformedIR));
    expect(result.source?.ir?.render).toBeUndefined();
    expect(result.source?.vanilla?.files[0]?.code).toContain('// Failed to generate vanilla code:');
    expect(result.previewIr).toBeNull();
  });
});
