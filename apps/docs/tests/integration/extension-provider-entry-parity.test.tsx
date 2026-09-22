import type { IRScene } from '@retikz/core';
import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import {
  DiamondArrowDefinition,
  CircleClipDefinition,
  CompoundClipDefinition,
  CrossShapeDefinition,
  createRibbonProviderContribution,
  RibbonPathKindDefinition,
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
        children: [{ kind: 'circle', cx: 0, cy: 0, r: 36 }],
      },
      children: [{ type: 'node', position: [0, 0], shape: 'cross', text: 'optional shape' }],
    },
    {
      type: 'path',
      marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'diamond' } }],
      children: [
        { type: 'step', kind: 'move', to: [60, 0] },
        { type: 'step', kind: 'line', to: [120, 0] },
      ],
    },
    {
      type: 'path',
      kind: 'ribbon',
      kindOptions: { width: 12 },
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
  pathKinds: [RibbonPathKindDefinition],
} as const;

describe('Extension root entry integration', () => {
  it('renders the quick-start input only when its selected definition is supplied', () => {
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
  it('keeps direct Core compile and Vanilla compilation scene-equivalent with exact capability entries', () => {
    const direct = compileToScene(source, definitions);
    const vanilla = toSceneResult(source, { compile: definitions });
    const svg = renderToSvgString(source, { compile: definitions });

    expect(vanilla.compileResult?.scene).toEqual(direct.scene);
    expect(vanilla.compileResult?.artifacts).toEqual(direct.artifacts);
    expect(svg).toContain('optional shape');
    expect(svg).toContain('<clipPath');
    expect(svg).toContain('<marker');
    expect(direct.scene.primitives.filter(primitive => primitive.type === 'path').length).toBeGreaterThan(1);
  });

  it('renders the same explicitly assembled capability set through React SSR', () => {
    const markup = renderToStaticMarkup(
      <Layout ir={source} extensions={definitions} idPrefix="extension-provider-entry" />,
    );

    expect(markup).toContain('<svg');
    expect(markup).toContain('optional shape');
    expect(markup).toContain('<clipPath');
    expect(markup).toContain('<marker');
  });

  it('resolves the Extension Ribbon provider contribution into the same compile entry', () => {
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
