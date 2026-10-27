import type { IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { PlotsLoweringOptions } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const opts: PlotsLoweringOptions = { layout: { width: 480, height: 300 } };

const expandOf = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, { ...opts, textMeasurer: measureLabel }).child as IRScope;
};

const firstLayer = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>): IRScope =>
  expandOf(spec, datasets).children[0] as IRScope;

const collectNodes = (scope: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];

  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(child as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };

  walk(scope.children);

  return out;
};

const collectPaths = (scope: IRScope): Array<IRPath> => {
  const out: Array<IRPath> = [];

  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(child as IRPath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };

  walk(scope.children);

  return out;
};

const collectScopes = (scope: IRScope): Array<IRScope> => {
  const out: Array<IRScope> = [];

  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type !== 'scope') continue;

      out.push(node as IRScope);
      if (node.children) walk(node.children);
    }
  };

  walk(scope.children);

  return out;
};

describe('通道核心覆盖（契约）', () => {
  it('将 cornerRadius 独立下发到节点和路径标记', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, cornerRadius: 'radius' } },
        { type: 'path', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, cornerRadius: 'radius' } },
      ],
    });
    const output = expandOf(spec, {
      d: [
        { x: 0, y: 0, radius: 4 },
        { x: 1, y: 1, radius: 4 },
      ],
    });
    expect(collectNodes(output).some(node => node.cornerRadius === 4)).toBe(true);
    expect(collectPaths(output).some(path => path.cornerRadius === 4)).toBe(true);
  });
  it('恒定风格通道传递到核心范围', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { strokeWidth: 2, zIndex: 3, opacity: { overall: 0.7, fill: 0.5, stroke: 0.4 } },
        },
      ],
    });

    expect(firstLayer(spec, { d: [{ x: 0, y: 0 }] })).toMatchObject({
      zIndex: 0,
      defaults: { style: { strokeWidth: 2, opacity: { overall: 0.7, fill: 0.5, stroke: 0.4 } } },
    });

    const [node] = collectNodes(firstLayer(spec, { d: [{ x: 0, y: 0 }] }));

    expect(node).toMatchObject({
      zIndex: 3,
    });
  });

  it('路径样式通道传递到核心路径', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: {
            cornerRadius: 4,
            strokeWidth: 3,
            lineCap: 'round',
            lineJoin: 'bevel',
            opacity: { overall: 0.6 },
          },
        },
      ],
    });
    const [path] = collectPaths(
      firstLayer(spec, {
        d: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      }),
    );

    expect(path).toMatchObject({
      cornerRadius: 4,
      style: { strokeWidth: 3, opacity: { overall: 0.6 }, lineCap: 'round', lineJoin: 'bevel' },
    });
  });

  it('间隔节点通道传递到核心节点', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          encodings: {
            strokeWidth: 'weight',
            position: { x: { field: 'cat' }, y: { field: 'value' } },
            opacity: { fill: 'alpha' },
          },
          properties: { opacity: { overall: 0.9 } },
        },
      ],
    });
    const nodes = collectNodes(
      firstLayer(spec, {
        d: [
          { cat: 'A', value: 1, weight: 0, alpha: 0 },
          { cat: 'B', value: 2, weight: 10, alpha: 10 },
        ],
      }),
    );

    expect(nodes[0].style?.strokeWidth).toBeCloseTo(0.5, 6);
    expect(nodes[1].style?.strokeWidth).toBeCloseTo(4, 6);
    expect(typeof nodes[0].style?.opacity === 'object' ? nodes[0].style.opacity.fill : undefined).toBeCloseTo(0.2, 6);
    expect(typeof nodes[1].style?.opacity === 'object' ? nodes[1].style.opacity.fill : undefined).toBeCloseTo(1, 6);
    expect(
      (firstLayer(spec, { d: [{ cat: 'A', value: 1, weight: 0, alpha: 0 }] }).defaults!.node as IRNode).style?.opacity,
    ).toEqual({ overall: 0.9 });
  });

  it('基准标签样式字段传递到核心节点标签', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          encodings: { label: { text: 'label' }, position: { x: { field: 'cat' }, y: { field: 'value' } } },
          properties: {
            label: {
              position: 'top',
              distance: 6,
              textColor: '#334155',
              opacity: 0.75,
              font: { family: 'serif', size: 12, weight: 'bold' },
              rotate: 'tangent',
              keepUpright: true,
              pin: { stroke: '#64748b', strokeWidth: 1.5, dashPattern: [2, 2] },
            },
          },
        },
      ],
    });
    const [node] = collectNodes(firstLayer(spec, { d: [{ cat: 'A', value: 1, label: 'A' }] }));

    expect(node.label).toMatchObject({
      text: 'A',
      position: 'top',
      distance: 6,
      textColor: '#334155',
      opacity: 0.75,
      font: { family: 'serif', size: 12, weight: 'bold' },
      rotate: 'tangent',
      keepUpright: true,
      pin: { stroke: '#64748b', strokeWidth: 1.5, dashPattern: [2, 2] },
    });
  });

  it('点文本颜色通道传递到核心文本节点', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: { textColor: 'tone', text: 'label', position: { x: { field: 'x' }, y: { field: 'y' } } },
        },
      ],
    });
    const nodes = collectNodes(
      firstLayer(spec, {
        d: [
          { x: 0, y: 0, label: 'A', tone: '#ef4444' },
          { x: 1, y: 1, label: 'B', tone: '#2563eb' },
        ],
      }),
    );

    expect(nodes.map(node => node.style?.textColor)).toEqual(['#ef4444', '#2563eb']);
  });

  it('节点标量和枚举通道传递到核心节点', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: { align: 'align', text: 'label', position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: {
            lineHeight: 18,
            maxTextWidth: 72,
            cornerRadius: 4,
            scale: { default: 1.1, x: 1.2, y: 0.9 },
            minimumSize: { default: 14, width: 16 },
            padding: { x: 3, y: 5 },
            margin: { default: 1, right: 2 },
            shadow: 'md',
            blendMode: 'multiply',
          },
        },
      ],
    });
    const [node] = collectNodes(firstLayer(spec, { d: [{ x: 0, y: 0, label: 'A', align: 'start' }] }));

    expect(node).toMatchObject({
      cornerRadius: 4,
      scale: { default: 1.1, x: 1.2, y: 0.9 },
      style: { shadow: 'md', blendMode: 'multiply' },
      layout: {
        align: 'start',
        lineHeight: 18,
        maxTextWidth: 72,
        minimumSize: { default: 14, width: 16 },
        padding: { x: 3, y: 5 },
        margin: { default: 1, right: 2 },
      },
    });
  });

  it('标记颜色将缩放颜色传递给核心节点颜色', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
        { type: 'ordinal', name: 'tone', range: ['#ef4444', '#2563eb'] },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: { color: { field: 'group', scale: 'tone' }, position: { x: { field: 'x' }, y: { field: 'y' } } },
        },
      ],
    });
    const nodeDefaults = collectScopes(
      firstLayer(spec, {
        d: [
          { x: 0, y: 0, group: 'A' },
          { x: 1, y: 1, group: 'B' },
        ],
      }),
    ).map(scope => scope.defaults?.node);

    expect(nodeDefaults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ style: expect.objectContaining({ color: '#ef4444', fill: '#ef4444' }) }),
        expect.objectContaining({ style: expect.objectContaining({ color: '#2563eb', fill: '#2563eb' }) }),
      ]),
    );
  });

  it('节点 json 通道传递到核心节点', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: { dashed: 'dashed', position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: {
            dotted: false,
            dashPattern: [6, 2],
            font: { family: 'serif', size: 14, weight: 'bold' },
            boundary: 'shape',
            shape: { type: 'rectangle', params: { cornerRadius: 8 } },
            shadow: { preset: 'sm', offsetX: 2, offsetY: 3 },
          },
        },
      ],
    });
    const [node] = collectNodes(firstLayer(spec, { d: [{ x: 0, y: 0, dashed: true }] }));

    expect(node).toMatchObject({
      boundary: 'shape',
      shape: { type: 'rectangle', params: { cornerRadius: 8 } },
      style: {
        dashed: true,
        dotted: false,
        dashPattern: [6, 2],
        font: { family: 'serif', size: 14, weight: 'bold' },
        shadow: { preset: 'sm', offsetX: 2, offsetY: 3 },
      },
    });
  });

  it('路径标量枚举和 json 通道传递到核心路径', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: {
            zIndex: 7,
            rotate: 15,
            scale: { x: 1.2, y: 0.8 },
            strokeWidth: 2,
            fillRule: 'evenodd',
            dashPattern: [4, 2],
            shadow: { preset: 'md', offsetX: 1, offsetY: 2 },
            blendMode: 'screen',
            opacity: { stroke: 0.45 },
          },
        },
      ],
    });
    const [path] = collectPaths(
      firstLayer(spec, {
        d: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      }),
    );

    expect(path).toMatchObject({
      zIndex: 7,
      rotate: 15,
      scale: { x: 1.2, y: 0.8 },
      style: {
        fillRule: 'evenodd',
        strokeWidth: 2,
        dashPattern: [4, 2],
        shadow: { preset: 'md', offsetX: 1, offsetY: 2 },
        blendMode: 'screen',
        opacity: { stroke: 0.45 },
      },
    });
    expect(path.marks).toBeUndefined();
  });
});

describe('共享图形样式传递', () => {
  it.each(['point', 'path', 'interval'])('为 %s 提供固定和编码的描边字段', type => {
    const make = (encoded: boolean) =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [
          {
            type,
            encodings: {
              position: { x: { field: 'x' }, y: { field: 'y' } },
              ...(encoded ? { dashOffset: 'offset', lineCap: 'cap', lineJoin: 'join' } : {}),
            },
            properties: { dashOffset: -2, lineCap: 'round', lineJoin: 'bevel', fill: 0, stroke: 0.4, opacity: 0.6 },
          },
        ],
      });
    for (const encoded of [false, true]) {
      const output = expandOf(make(encoded), {
        d: [
          { x: 0, y: 1, offset: 3, cap: 'square', join: 'miter' },
          { x: 1, y: 2, offset: 3, cap: 'square', join: 'miter' },
        ],
      });
      const elements = type === 'path' ? collectPaths(output) : collectNodes(output);
      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0].style).toMatchObject({
        dashOffset: encoded ? 3 : -2,
        lineCap: encoded ? 'square' : 'round',
        lineJoin: encoded ? 'miter' : 'bevel',
      });
      const fixedStyle = { fill: 0, stroke: 0.4, opacity: { overall: 0.6 } };
      if (type === 'path') expect(elements[0].style).toMatchObject(fixedStyle);
      else
        expect(collectScopes(output)).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              defaults: expect.objectContaining({
                node: expect.objectContaining({ style: expect.objectContaining(fixedStyle) }),
              }),
            }),
          ]),
        );
    }
  });
  it('在对填充因子进行编码时保留标量整体不透明度', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, opacity: { fill: 'alpha' } },
          properties: { opacity: 0.4, text: 'label', textColor: 0.2 },
        },
      ],
    });
    const output = expandOf(spec, {
      d: [
        { x: 0, y: 0, alpha: 0 },
        { x: 1, y: 1, alpha: 1 },
      ],
    });
    expect(collectNodes(output)[0].style).toMatchObject({ textColor: 0.2, opacity: { fill: 0.2 } });
    expect(collectScopes(output)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          defaults: expect.objectContaining({
            node: expect.objectContaining({ style: expect.objectContaining({ opacity: { overall: 0.4 } }) }),
          }),
        }),
      ]),
    );
  });
});
