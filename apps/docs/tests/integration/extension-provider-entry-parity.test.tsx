import type { IRScene } from '@retikz/core';
import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import {
  DiamondArrowDefinition,
  CircleClipDefinition,
  CompoundClipDefinition,
  CrossShapeDefinition,
  createRibbonProviderContribution,
  RibbonPathDefinition,
} from '@retikz/extension';
import { Layout } from '@retikz/react';
import { renderToSvgString, scene, toSceneResult } from '@retikz/vanilla';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

const source: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'scope',
      clip: {
        kind: 'compound',
        params: {
          children: [{ kind: 'circle', params: { cx: 0, cy: 0, r: 36 } }],
        },
      },
      children: [{ type: 'node', position: [0, 0], shape: 'cross', text: 'optional shape' }],
    },
    {
      type: 'path',
      arrow: { end: { shape: 'diamond' } },
      children: [
        { type: 'step', kind: 'move', to: [60, 0] },
        { type: 'step', kind: 'line', to: [120, 0] },
      ],
    },
    {
      type: 'path',
      kind: 'ribbon',
      kindOptions: {
        width: { kind: 'fixed', value: 12 },
        start: { label: { text: 'Source endpoint' } },
        end: { label: { text: 'Target endpoint', rotate: 'tangent' } },
      },
      children: [
        { type: 'step', kind: 'move', to: [-60, 40] },
        { type: 'step', kind: 'line', to: [60, 40] },
      ],
      style: { fill: '#60a5fa' },
    },
  ],
};

const definitions = {
  shapes: [CrossShapeDefinition],
  arrows: [DiamondArrowDefinition],
  clips: [CompoundClipDefinition, CircleClipDefinition],
  paths: [RibbonPathDefinition],
} as const;

describe('扩展根条目集成', () => {
  it('仅在提供所选定义时渲染快速启动输入', () => {
    const input = scene({
      children: [
        {
          type: 'node',
          position: [0, 0],
          shape: 'cross',
          fill: '#38bdf8',
          layout: { minimumSize: { width: 80, height: 80 } },
        },
      ],
    });

    expect(() => renderToSvgString(input)).toThrow(/cross/);

    const svg = renderToSvgString(input, { compile: { shapes: [CrossShapeDefinition] } });

    expect(svg).toContain('<svg');
    expect(svg).toContain('#38bdf8');
    expect(svg).toContain('<path');
  });

  it('保持直接 Core 编译和 Vanilla 编译场景与精确的功能条目等效', () => {
    const direct = compileToScene(source, definitions);
    const vanilla = toSceneResult(source, { compile: definitions });
    const svg = renderToSvgString(source, { compile: definitions });

    expect(vanilla.compileResult?.scene).toEqual(direct.scene);
    expect(vanilla.compileResult?.artifacts).toEqual(direct.artifacts);
    expect(svg).toContain('optional shape');
    expect(svg).toContain('Source endpoint');
    expect(svg).toContain('Target endpoint');
    expect(svg).toContain('<clipPath');
    expect(svg).toContain('d="M 0 5 L 5 0 L 10 5 L 5 10 Z"');
    expect(direct.scene.primitives.filter(primitive => primitive.type === 'path').length).toBeGreaterThan(1);
  });

  it('通过 React SSR 呈现相同的显式组装的能力集', () => {
    const markup = renderToStaticMarkup(
      <Layout ir={source} extensions={definitions} idPrefix="extension-provider-entry" />,
    );

    expect(markup).toContain('<svg');
    expect(markup).toContain('optional shape');
    expect(markup).toContain('Source endpoint');
    expect(markup).toContain('Target endpoint');
    expect(markup).toContain('<clipPath');
    expect(markup).toContain('d="M 0 5 L 5 0 L 10 5 L 5 10 Z"');
  });

  it('将 Extension Ribbon 提供者贡献解析到同一编译入口', () => {
    const providerDefinitions = resolveCoreProviderDependencies({
      contributions: [createRibbonProviderContribution()],
      definitions: {
        shapes: definitions.shapes,
        arrows: definitions.arrows,
        clips: definitions.clips,
      },
    });
    const resolved = compileToScene(source, providerDefinitions);

    expect(resolved.scene).toEqual(compileToScene(source, definitions).scene);
  });
});
