import type { IRScene, Scene, ScenePrimitive } from '@retikz/core';
import type { IRGraph } from '@retikz/graph';
import type { InputGraph } from '@retikz/graph-vanilla';
import type { FC } from 'react';

import { compileToScene, ThemeMode } from '@retikz/core';
import { createGraphDefinitions } from '@retikz/graph';
import { Entity, Graph, Relation } from '@retikz/graph-react';
import { createGraphVanillaAdapters, graph, GraphInputEmbedAdapter, normalizeGraph } from '@retikz/graph-vanilla';
import { Node } from '@retikz/react';
import { drawScene } from '@retikz/render/canvas';
import { renderToSvgString } from '@retikz/render/svg';
import { normalizeScene, renderToSvgString as renderVanillaToSvgString, scene } from '@retikz/vanilla';
import { createElement, Fragment } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  PreviewCoreThemeStyles,
  PreviewGraphThemeStyles,
  PreviewThemeStyle,
} from '../../src/modules/docs/components/component-preview/theme';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';

const graphInput: InputGraph = {
  id: 'workflow',
  children: [
    {
      type: 'entity',
      id: 'start',
      role: 'event',
      text: 'Start',
      position: [40, 80],
    },
    {
      type: 'entity',
      id: 'step',
      role: 'activity',
      text: 'Process',
      position: [180, 80],
    },
    {
      type: 'relation',
      id: 'flow',
      source: { id: 'start' },
      target: { id: 'step' },
      role: 'flow',
      labels: [{ text: 'next', position: 0.5 }],
      way: ['start', 'step'],
    },
    { type: 'node', id: 'caption', position: [130, 170], text: 'Graph decoration' },
  ],
};

const ReactGraph: FC = () =>
  createElement(
    Graph,
    { id: 'workflow' },
    createElement(Entity, { id: 'start', role: 'event', position: [40, 80] }, 'Start'),
    createElement(Entity, { id: 'step', role: 'activity', position: [180, 80] }, 'Process'),
    createElement(Relation, {
      id: 'flow',
      source: { id: 'start' },
      target: { id: 'step' },
      role: 'flow',
      labels: [{ text: 'next', position: 0.5 }],
      way: ['start', 'step'],
    }),
    createElement(Node, { id: 'caption', position: [130, 170], text: 'Graph decoration' }),
  );

const sceneOf = (graphSource: IRGraph, theme?: IRScene['theme']): Scene =>
  compileToScene(
    {
      type: 'scene',
      version: 1,
      viewBox: { x: 0, y: 0, width: 280, height: 200 },
      ...(theme === undefined ? {} : { theme }),
      children: [graphSource],
    },
    {
      composites: createGraphDefinitions({ graphThemeStyles: PreviewGraphThemeStyles }),
      themeStyles: PreviewCoreThemeStyles,
      padding: 0,
    },
  ).scene;

const DirectSemanticGraph: FC = () =>
  createElement(
    Fragment,
    null,
    createElement(Node, { id: 'direct-source', position: [0, 0] }),
    createElement(Node, { id: 'direct-target', position: [120, 0] }),
    createElement(Entity, { role: 'activity', position: [60, 70] }, 'Anonymous'),
    createElement(Relation, {
      role: 'association',
      source: { id: 'direct-source', anchor: 'right', offset: [2, -1], boundary: 'shape' },
      target: { id: 'direct-target', anchor: 'left', offset: [-2, 1], boundary: 'shape' },
    }),
    createElement(
      Graph,
      null,
      createElement(Graph, null, createElement(Entity, { role: 'concept', position: [220, 70] }, 'Nested')),
    ),
  );

const primitivesOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...primitivesOf(primitive.children)] : [primitive],
  );

const graphAppearanceOf = (compiled: Scene): Array<ScenePrimitive> =>
  primitivesOf(compiled.primitives).filter(
    primitive =>
      (primitive.type === 'group' && (primitive.id === 'start' || primitive.id === 'step')) ||
      (primitive.type === 'path' && primitive.id === 'flow') ||
      (primitive.type === 'text' &&
        primitive.lines.some(line => line.text === 'Start' || line.text === 'Process' || line.text === 'next')),
  );

const recordingContext = (calls: Array<string>): CanvasRenderingContext2D =>
  new Proxy(
    {},
    {
      get: (_target, property) => (typeof property === 'string' ? vi.fn(() => calls.push(property)) : undefined),
      set: () => true,
    },
  ) as CanvasRenderingContext2D;

describe('Graph renderer integration', () => {
  it('让 direct、React 与 Vanilla 产生同一个 IRGraph root', () => {
    const direct = normalizeGraph(graphInput);
    const react = buildPreviewIR(ReactGraph).ir.children[0];
    const vanilla = normalizeScene(
      { children: [graph('workflow', graphInput)] },
      { adapters: createGraphVanillaAdapters() },
    ).ir.children[0];

    expect(react).toEqual(direct);
    expect(vanilla).toEqual(direct);
  });

  it('把 Entity 与 Relation 展示收敛到普通 Core Scene primitives', () => {
    const source = normalizeGraph(graphInput);
    const compiled = sceneOf(source);
    const primitives = primitivesOf(compiled.primitives);
    const groupIds = primitives.flatMap(primitive =>
      primitive.type === 'group' && primitive.id !== undefined ? [primitive.id] : [],
    );

    expect(groupIds).toEqual(expect.arrayContaining(['start', 'step']));
    expect(primitives.some(primitive => primitive.type === 'path')).toBe(true);
    expect(
      primitives.some(primitive => primitive.type === 'text' && primitive.lines.some(line => line.text === 'Start')),
    ).toBe(true);
    expect(
      primitives.some(primitive => primitive.type === 'text' && primitive.lines.some(line => line.text === 'Process')),
    ).toBe(true);
    expect(JSON.stringify(compiled)).not.toContain('"namespace":"graph"');
  });

  it('用唯一 Graph adapter 生成可运行 Vanilla preview', () => {
    const vanilla = buildVanillaPreview(buildPreviewIR(ReactGraph), {
      theme: { style: PreviewThemeStyle.Vibrant, mode: ThemeMode.Light },
    });

    expect(vanilla.code).toContain("graph('preview-graph-1'");
    expect(vanilla.code).toContain('GraphInputEmbedAdapter');
    expect(vanilla.code).not.toContain('EntityInputEmbedAdapter');
    expect(vanilla.code).not.toContain('RelationInputEmbedAdapter');
    expect(vanilla.code).toContain('graphThemeStyles: PreviewThemeDefinitionBundle.graph');
    expect(vanilla.svg).toContain('<svg');
  });

  it('让 direct Entity、direct Relation 与 nested Graph 通过各自 adapter 生成可运行 Vanilla preview', () => {
    const vanilla = buildVanillaPreview(buildPreviewIR(DirectSemanticGraph));

    expect(vanilla.code).toContain("entity('preview-entity-1'");
    expect(vanilla.code).toContain("relation('preview-relation-1'");
    expect(vanilla.code.match(/graph\('preview-graph-/g)).toHaveLength(2);
    expect(vanilla.code).toContain('EntityInputEmbedAdapter');
    expect(vanilla.code).toContain('RelationInputEmbedAdapter');
    expect(vanilla.code).toContain('GraphInputEmbedAdapter');
    expect(vanilla.code).not.toContain("id: 'preview-entity-1'");
    expect(vanilla.code).not.toContain("id: 'preview-relation-1'");
    expect(vanilla.code).not.toContain("id: 'preview-graph-1'");
    expect(vanilla.svg).toContain('<svg');
  });

  it('让 Vanilla preview 使用宿主文本度量以对齐 React 布局', () => {
    const narrowMeasureText = vi.fn(() => ({ width: 20, height: 16, ascent: 12, descent: 4 }));
    const wideMeasureText = vi.fn(() => ({ width: 120, height: 24, ascent: 18, descent: 6 }));
    const preview = buildPreviewIR(ReactGraph);
    const narrow = buildVanillaPreview(preview, { measureText: narrowMeasureText });
    const wide = buildVanillaPreview(preview, { measureText: wideMeasureText });

    expect(narrowMeasureText).toHaveBeenCalled();
    expect(wideMeasureText).toHaveBeenCalled();
    expect(narrow.svg).not.toBe(wide.svg);
  });

  it('让同一 Graph root 通过 SVG、Canvas 与 Vanilla runtime 渲染', () => {
    const source = normalizeGraph(graphInput);
    const compiled = sceneOf(source);
    const calls: Array<string> = [];
    const vanillaInput = scene({ children: [graph('workflow', graphInput)] });

    expect(renderToSvgString(compiled, { idPrefix: 'graph' })).toContain('<svg');
    expect(() => drawScene(recordingContext(calls), compiled)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
    expect(
      renderVanillaToSvgString(vanillaInput, {
        adapters: [GraphInputEmbedAdapter],
        output: { width: 280, height: 200 },
      }),
    ).toContain('<svg');
  });

  it('让包含 Block 的同一 Core Scene 通过 SVG 与 Canvas 渲染', () => {
    const source = normalizeGraph({
      children: [
        {
          type: 'block',
          id: 'user',
          children: [
            {
              type: 'blockHeader',
              title: { text: 'User' },
              description: { text: 'Domain entity' },
            },
            {
              type: 'blockSection',
              id: 'user.fields',
              children: [
                {
                  type: 'blockRow',
                  id: 'user.name',
                  children: [
                    {
                      key: 'name',
                      child: { type: 'node', position: [0, 0], text: 'name', padding: 0, margin: 0 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const compiled = sceneOf(source);
    const calls: Array<string> = [];
    const svg = renderToSvgString(compiled, { idPrefix: 'graph-block' });

    expect(svg).toContain('<svg');
    expect(svg).toContain('User');
    expect(() => drawScene(recordingContext(calls), compiled)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
    expect(JSON.stringify(compiled)).not.toContain('"type":"block"');
  });

  it.each([PreviewThemeStyle.Academic, PreviewThemeStyle.Vibrant, PreviewThemeStyle.Clean])(
    '让 Graph reference style 的同一 Scene appearance 同时被 SVG 与 Canvas 消费：%s',
    style => {
      const compiled = sceneOf(normalizeGraph(graphInput), { style, mode: ThemeMode.Light });
      const calls: Array<string> = [];
      const serialized = JSON.stringify(compiled.primitives);

      expect(serialized).toContain('strokeWidth');
      expect(renderToSvgString(compiled, { idPrefix: `graph-${style}` })).toContain('<svg');
      expect(() => drawScene(recordingContext(calls), compiled)).not.toThrow();
      expect(calls.length).toBeGreaterThan(0);
    },
  );

  it.each([PreviewThemeStyle.Academic, PreviewThemeStyle.Vibrant, PreviewThemeStyle.Clean])(
    '让 Graph reference style 的 Entity 正文解析为确定的对比色：%s',
    style => {
      const compiled = sceneOf(normalizeGraph(graphInput), { style, mode: ThemeMode.Light });
      const entityText = primitivesOf(compiled.primitives).find(
        primitive => primitive.type === 'text' && primitive.lines.some(line => line.text === 'Start'),
      );

      expect(entityText?.type).toBe('text');
      if (entityText?.type !== 'text') return;
      expect(['#000000', '#ffffff']).toContain(entityText.fill);
    },
  );

  it.each([ThemeMode.Light, ThemeMode.Dark])('让 Graph Clean 完整继承 Neutral Entity appearance：%s', mode => {
    const neutral = sceneOf(normalizeGraph(graphInput), { mode });
    const clean = sceneOf(normalizeGraph(graphInput), { style: PreviewThemeStyle.Clean, mode });

    expect(graphAppearanceOf(clean)).toEqual(graphAppearanceOf(neutral));
  });
});
