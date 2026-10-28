import type { CompileWarning, IRNode } from '@retikz/core';
import { compileToScene, defineTheme, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';
import { compileInHarness, naturalProposal, pathPrimitivesOf, primitivesOf } from './test-utils';

describe('Group 布局感知下沉', () => {
  it('使用默认的 Surface shell 作为空 Group 的唯一分配', () => {
    const { result } = compileInHarness(Graph.createGroup({}), naturalProposal, Graph.createGraphDefinitions());

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 20, height: 20 });
    expect(result.slotSize).toEqual({ width: 20, height: 20 });
  });

  it('在绘制默认背景和边框时保持边界标签仅可见', () => {
    const { output, result } = compileInHarness(
      Graph.createGroup({ labels: [{ text: 'external contract', position: 'top', distance: 8 }] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const visiblePaths = pathPrimitivesOf(output.scene.primitives).filter(
      path => path.fill !== 'none' || path.stroke !== 'none',
    );

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 20, height: 20 });
    expect(result.visualBounds.y).toBeLessThan(result.allocationBounds.y);
    expect(visiblePaths).toHaveLength(2);
    expect(visiblePaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fill: 'lightgray', fillOpacity: 0.04, stroke: 'none' }),
        expect.objectContaining({
          fill: 'none',
          stroke: 'lightgray',
          strokeWidth: 1,
          dashPattern: [4, 3],
        }),
      ]),
    );
    expect(
      visiblePaths.every(path => path.commands.some(command => command.kind === 'arc' && command.radius === 4)),
    ).toBe(true);
  });

  it('将名为 Graph 的主题默认应用于 Group 根 shell', () => {
    const styleName = 'group-shell';
    const graphStyle = Graph.defineGraphTheme({
      name: styleName,
      resolve: () => ({
        defaults: {
          group: {
            background: { fill: '#fed7aa', opacity: { fill: 0.6 } },
            border: { stroke: '#9a3412', strokeWidth: 3, dashPattern: [1, 2] },
            cornerRadius: 7,
          },
        },
      }),
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        theme: { name: styleName },
        children: [Graph.createGroup({})],
      },
      {
        composites: Graph.createGraphDefinitions({ graphThemeDefinitions: [graphStyle] }),
        themeDefinitions: [defineTheme({ name: styleName, resolve: () => ({}) })],
        padding: 0,
      },
    );
    const visiblePaths = pathPrimitivesOf(output.scene.primitives).filter(
      path => path.fill !== 'none' || path.stroke !== 'none',
    );

    expect(visiblePaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fill: '#fed7aa', fillOpacity: 0.6, stroke: 'none' }),
        expect.objectContaining({ stroke: '#9a3412', strokeWidth: 3, dashPattern: [1, 2] }),
      ]),
    );
    expect(
      visiblePaths.every(path => path.commands.some(command => command.kind === 'arc' && command.radius === 7)),
    ).toBe(true);
  });

  it('将主题 Group 边框替换为一个完整的显式 Source 字段', () => {
    const styleName = 'group-explicit-shell';
    const graphStyle = Graph.defineGraphTheme({
      name: styleName,
      resolve: () => ({
        defaults: {
          group: {
            background: { fill: '#fef3c7' },
            border: { stroke: '#92400e', strokeWidth: 4, dashPattern: [2, 2], opacity: { stroke: 0.3 } },
            cornerRadius: 10,
          },
        },
      }),
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        theme: { name: styleName },
        children: [Graph.createGroup({ border: { stroke: '#2563eb', strokeWidth: 2 } })],
      },
      {
        composites: Graph.createGraphDefinitions({ graphThemeDefinitions: [graphStyle] }),
        themeDefinitions: [defineTheme({ name: styleName, resolve: () => ({}) })],
        padding: 0,
      },
    );
    const border = pathPrimitivesOf(output.scene.primitives).find(path => path.stroke === '#2563eb');

    expect(border).toEqual(expect.objectContaining({ strokeWidth: 2 }));
    expect(border?.strokeOpacity).toBeUndefined();
    expect(border?.dashPattern).toBeUndefined();
    expect(pathPrimitivesOf(output.scene.primitives)).toEqual(
      expect.arrayContaining([expect.objectContaining({ fill: '#fef3c7' })]),
    );
  });

  it('将底部标题排列在非空正文之后，并在分配中包含 bodyGap', () => {
    const body: IRNode = {
      type: 'node',
      position: [10, 5],
      layout: { minimumSize: { width: 20, height: 10 }, padding: 0 },
    };
    const withoutGap = compileInHarness(
      Graph.createGroup({
        padding: 0,
        border: { stroke: 'none' },
        caption: { side: 'bottom', bodyGap: 0, title: { text: 'Caption' } },
        children: [body],
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    ).result;
    const withGap = compileInHarness(
      Graph.createGroup({
        padding: 0,
        border: { stroke: 'none' },
        caption: { side: 'bottom', bodyGap: 7, title: { text: 'Caption' } },
        children: [body],
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    ).result;

    expect(withGap.allocationBounds.height - withoutGap.allocationBounds.height).toBeCloseTo(7);
  });

  it('将生成的表示节点与编写的 nodeDefault 隔离', () => {
    const warnings: Array<CompileWarning> = [];
    const { output } = compileInHarness(
      Graph.createGroup({
        caption: { title: { text: 'Title' } },
        labels: [{ text: 'Boundary' }],
        defaults: {
          node: {
            style: { fill: '#ef4444', stroke: '#2563eb', textColor: 'contrast' },
            layout: { minimumSize: 200 },
          },
        },
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
      { onWarn: warning => warnings.push(warning) },
    );
    const paths = pathPrimitivesOf(output.scene.primitives);

    expect(paths.some(path => path.fill === '#ef4444' || path.stroke === '#2563eb')).toBe(false);
    expect(warnings).toEqual([]);
  });

  it('保持默认标题权重规则，同时保留显式权重', () => {
    const defaultTitle = compileInHarness(
      Graph.createGroup({ caption: { title: { text: 'Title' } } }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const explicitTitle = compileInHarness(
      Graph.createGroup({ caption: { title: { text: 'Title', font: { weight: 700 } } } }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const textPrimitives = (output: typeof defaultTitle.output) =>
      primitivesOf(output.scene.primitives).filter(
        (primitive): primitive is Extract<(typeof output.scene.primitives)[number], { type: 'text' }> =>
          primitive.type === 'text',
      );

    expect(textPrimitives(defaultTitle.output)).toEqual([
      expect.not.objectContaining({ fontWeight: expect.anything() }),
    ]);
    expect(textPrimitives(explicitTitle.output)).toEqual([expect.objectContaining({ fontWeight: 700 })]);
  });

  it('默认仅包含文本的边界标签位于 Group 下方的左下点', () => {
    const { output, result } = compileInHarness(
      Graph.createGroup({ labels: [{ text: 'Boundary' }] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const text = primitivesOf(output.scene.primitives).filter(
      (primitive): primitive is Extract<(typeof output.scene.primitives)[number], { type: 'text' }> =>
        primitive.type === 'text',
    );

    expect(text).toHaveLength(1);
    expect(text[0]?.x - (text[0]?.measuredWidth ?? 0) / 2).toBeCloseTo(result.allocationBounds.x);
    expect(text[0]?.y).toBeGreaterThan(result.allocationBounds.y + result.allocationBounds.height);
  });

  it('默认边界标签排版为描述比例和灰色，同时保留显式覆盖', () => {
    const defaultLabel = compileInHarness(
      Graph.createGroup({ labels: [{ text: 'Boundary' }] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const explicitLabel = compileInHarness(
      Graph.createGroup({
        labels: [{ text: 'Boundary', font: { size: 20 }, textColor: '#ef4444' }],
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const textPrimitives = (output: typeof defaultLabel.output) =>
      primitivesOf(output.scene.primitives).filter(
        (primitive): primitive is Extract<(typeof output.scene.primitives)[number], { type: 'text' }> =>
          primitive.type === 'text',
      );

    expect(textPrimitives(defaultLabel.output)).toEqual([expect.objectContaining({ fontSize: 12, fill: 'gray' })]);
    expect(textPrimitives(explicitLabel.output)).toEqual([expect.objectContaining({ fontSize: 20, fill: '#ef4444' })]);
  });

  it('保留显式边界标签对齐', () => {
    const { output, result } = compileInHarness(
      Graph.createGroup({ labels: [{ text: 'Boundary', align: 'middle' }] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const text = primitivesOf(output.scene.primitives).filter(
      (primitive): primitive is Extract<(typeof output.scene.primitives)[number], { type: 'text' }> =>
        primitive.type === 'text',
    );

    expect(text).toHaveLength(1);
    expect(text[0]?.x).toBeCloseTo(result.allocationBounds.x);
  });

  it('仅将嵌套的 Group Graph 规则堆叠到可见的 Entity 和 Relation 后代上', () => {
    const { output } = compileInHarness(
      Graph.createGroup({
        graphRules: [{ type: 'entity', style: { fill: '#ef4444' } }],
        caption: { title: { text: 'Outer' } },
        children: [
          Graph.createGroup({
            graphRules: [{ type: 'entity', style: { fill: '#2563eb' } }],
            children: [
              Graph.createEntity({ role: 'activity', position: [30, 20], text: 'Nested' }),
              {
                type: 'node',
                position: [100, 20],
                text: 'Core',
                style: { fill: '#22c55e' },
              },
            ],
          }),
        ],
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const fills = primitivesOf(output.scene.primitives).flatMap(primitive =>
      'fill' in primitive ? [primitive.fill] : [],
    );

    expect(fills).toContain('#2563eb');
    expect(fills).toContain('#22c55e');
    expect(fills).not.toContain('#ef4444');
  });

  it('将 Group Scope id 发布为普通 Core Relation 目标，而不暴露宿主 id', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.GraphProviderKey], providers: Graph.createGraphProviders() }],
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          Graph.createGroup({ id: 'runtime', children: [{ type: 'node', position: [40, 30], text: 'Runtime' }] }),
          { type: 'node', id: 'consumer', position: [260, 30], text: 'Consumer' },
          {
            namespace: 'graph',
            type: 'relation',
            role: 'dependency',
            source: { id: 'runtime', anchor: 'right' },
            target: { id: 'consumer', anchor: 'left' },
          },
        ],
      },
      { ...definitions, padding: 0 },
    );
    const serialized = JSON.stringify(output.scene);

    expect(serialized).toContain('runtime');
    expect(serialized).not.toContain('__group');
  });
});
