import type { IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const opts: LowerPlotsOptions = { layout: { width: 480, height: 300 } };

const expandOf = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  return lowerPlot(spec, datasets, { ...opts, textMeasurer: measureLabel }) as IRScope;
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

describe('channel core coverage (contract)', () => {
  it('delivers cornerRadius independently to node and path marks', () => {
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
  it('constant_style_channels_deliver_to_core_scope', () => {
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

  it('path_style_channels_deliver_to_core_path', () => {
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

  it('interval_node_channels_deliver_to_core_node', () => {
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

  it('datum_label_style_fields_deliver_to_core_node_label', () => {
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

  it('point_text_color_channel_delivers_to_core_text_node', () => {
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

  it('node_scalar_and_enum_channels_deliver_to_core_node', () => {
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

  it('mark_color_delivers_scaled_color_to_core_node_color', () => {
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

  it('node_json_channels_deliver_to_core_node', () => {
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

  it('path_scalar_enum_and_json_channels_deliver_to_core_path', () => {
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
