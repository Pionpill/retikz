import type { IRNode, IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { PlotSpec } from '../../../src/schemas';

import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSpecSchema } from '../../../src/schemas';

const opts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  const [def] = lowerPlots(datasets, opts);
  return def.expand(spec) as IRScope;
};

const firstLayer = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope =>
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

describe('channel core coverage (alpha.12 ADR-12)', () => {
  it('constant_style_channels_deliver_to_core_scope', () => {
    const spec = PlotSpecSchema.parse({
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
          strokeWidth: { kind: 'constant', value: 2 },
          opacity: { kind: 'constant', value: 0.7 },
          fillOpacity: { kind: 'constant', value: 0.5 },
          drawOpacity: { kind: 'constant', value: 0.4 },
          zIndex: { kind: 'constant', value: 3 },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    expect(firstLayer(spec, { d: [{ x: 0, y: 0 }] })).toMatchObject({
      strokeWidth: 2,
      opacity: 0.7,
      fillOpacity: 0.5,
      drawOpacity: 0.4,
      zIndex: 3,
    });
  });

  it('path_style_channels_deliver_to_core_path', () => {
    const spec = PlotSpecSchema.parse({
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
          strokeWidth: { kind: 'constant', value: 3 },
          opacity: { kind: 'constant', value: 0.6 },
          lineCap: { kind: 'constant', value: 'round' },
          lineJoin: { kind: 'constant', value: 'bevel' },
          roundedCorners: { kind: 'constant', value: 4 },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
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
      strokeWidth: 3,
      opacity: 0.6,
      lineCap: 'round',
      lineJoin: 'bevel',
      roundedCorners: 4,
    });
  });

  it('interval_node_channels_deliver_to_core_node', () => {
    const spec = PlotSpecSchema.parse({
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
          strokeWidth: { kind: 'field', value: 'weight' },
          fillOpacity: { kind: 'field', value: 'alpha' },
          opacity: { kind: 'constant', value: 0.9 },
          encoding: { x: { field: 'cat' }, y: { field: 'value' } },
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
    expect(nodes[0].strokeWidth).toBeCloseTo(0.5, 6);
    expect(nodes[1].strokeWidth).toBeCloseTo(4, 6);
    expect(nodes[0].fillOpacity).toBeCloseTo(0.2, 6);
    expect(nodes[1].fillOpacity).toBeCloseTo(1, 6);
    expect((firstLayer(spec, { d: [{ cat: 'A', value: 1, weight: 0, alpha: 0 }] }).nodeDefault as IRNode).opacity).toBe(
      0.9,
    );
  });

  it('datum_label_style_fields_deliver_to_core_node_label', () => {
    const spec = PlotSpecSchema.parse({
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
          label: {
            content: { field: 'label' },
            position: 'top',
            distance: 6,
            textColor: '#334155',
            opacity: 0.75,
            font: { family: 'serif', size: 12, weight: 'bold' },
            rotate: 'tangent',
            keepUpright: true,
            pin: { stroke: '#64748b', strokeWidth: 1.5, dashPattern: [2, 2] },
          },
          encoding: { x: { field: 'cat' }, y: { field: 'value' } },
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
    const spec = PlotSpecSchema.parse({
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
          textColor: { kind: 'field', value: 'tone' },
          encoding: { x: { field: 'x' }, y: { field: 'y' }, text: { field: 'label' } },
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
    expect(nodes.map(node => node.textColor)).toEqual(['#ef4444', '#2563eb']);
  });

  it('node_scalar_and_enum_channels_deliver_to_core_node', () => {
    const spec = PlotSpecSchema.parse({
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
          align: { kind: 'field', value: 'align' },
          lineHeight: { kind: 'constant', value: 18 },
          maxTextWidth: { kind: 'constant', value: 72 },
          cornerRadius: { kind: 'constant', value: 4 },
          scale: { kind: 'constant', value: { default: 1.1, x: 1.2, y: 0.9 } },
          minimumSize: { kind: 'constant', value: { default: 14, width: 16 } },
          padding: { kind: 'constant', value: { x: 3, y: 5 } },
          margin: { kind: 'constant', value: { default: 1, right: 2 } },
          shadow: { kind: 'constant', value: 'md' },
          blendMode: { kind: 'constant', value: 'multiply' },
          encoding: { x: { field: 'x' }, y: { field: 'y' }, text: { field: 'label' } },
        },
      ],
    });
    const [node] = collectNodes(firstLayer(spec, { d: [{ x: 0, y: 0, label: 'A', align: 'left' }] }));
    expect(node).toMatchObject({
      align: 'left',
      lineHeight: 18,
      maxTextWidth: 72,
      cornerRadius: 4,
      scale: { default: 1.1, x: 1.2, y: 0.9 },
      minimumSize: { default: 14, width: 16 },
      padding: { x: 3, y: 5 },
      margin: { default: 1, right: 2 },
      shadow: 'md',
      blendMode: 'multiply',
    });
  });

  it('mark_color_delivers_scaled_color_to_core_node_color', () => {
    const spec = PlotSpecSchema.parse({
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
          color: { kind: 'field', value: 'group', scale: 'tone' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
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
    ).map(scope => scope.nodeDefault);
    expect(nodeDefaults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: '#ef4444', fill: '#ef4444' }),
        expect.objectContaining({ color: '#2563eb', fill: '#2563eb' }),
      ]),
    );
  });

  it('node_json_channels_deliver_to_core_node', () => {
    const spec = PlotSpecSchema.parse({
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
          dashed: { kind: 'field', value: 'dashed' },
          dotted: { kind: 'constant', value: false },
          dashPattern: { kind: 'constant', value: [6, 2] },
          font: { kind: 'constant', value: { family: 'serif', size: 14, weight: 'bold' } },
          boundary: { kind: 'constant', value: 'shape' },
          shape: { kind: 'constant', value: { type: 'rectangle', params: { cornerRadius: 8 } } },
          shadow: { kind: 'constant', value: { preset: 'sm', offsetX: 2, offsetY: 3 } },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    const [node] = collectNodes(firstLayer(spec, { d: [{ x: 0, y: 0, dashed: true }] }));
    expect(node).toMatchObject({
      dashed: true,
      dotted: false,
      dashPattern: [6, 2],
      font: { family: 'serif', size: 14, weight: 'bold' },
      boundary: 'shape',
      shape: { type: 'rectangle', params: { cornerRadius: 8 } },
      shadow: { preset: 'sm', offsetX: 2, offsetY: 3 },
    });
  });

  it('path_scalar_enum_and_json_channels_deliver_to_core_path', () => {
    const spec = PlotSpecSchema.parse({
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
          drawOpacity: { kind: 'constant', value: 0.45 },
          zIndex: { kind: 'constant', value: 7 },
          rotate: { kind: 'constant', value: 15 },
          scale: { kind: 'constant', value: { x: 1.2, y: 0.8 } },
          fillRule: { kind: 'constant', value: 'evenodd' },
          thickness: { kind: 'constant', value: 'thick' },
          dashPattern: { kind: 'constant', value: [4, 2] },
          shadow: { kind: 'constant', value: { preset: 'md', offsetX: 1, offsetY: 2 } },
          blendMode: { kind: 'constant', value: 'screen' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
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
      drawOpacity: 0.45,
      zIndex: 7,
      rotate: 15,
      scale: { x: 1.2, y: 0.8 },
      fillRule: 'evenodd',
      thickness: 'thick',
      dashPattern: [4, 2],
      shadow: { preset: 'md', offsetX: 1, offsetY: 2 },
      blendMode: 'screen',
    });
    expect(path.marks).toBeUndefined();
  });
});
