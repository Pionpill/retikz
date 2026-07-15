import type { IRNode, IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlotSpec } from '../../../src/schemas';

import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSpecSchema } from '../../../src/schemas';

const opts: LowerPlotsOptions = { width: 200, height: 100 };

const expandOf = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = opts,
): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const markLayer = (root: IRScope, index: number): IRScope => root.children[index] as IRScope;

const collectPaths = (layer: IRScope): Array<IRPath> => {
  const out: Array<IRPath> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(node as IRPath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

const collectNodes = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(node as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

const baseSpec = (marks: unknown): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks,
    guides: [],
  });

describe('contract mark host label lowering', () => {
  it('path-mark-host-geometry-label：PathMark label lowering 到 core Path.label', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'path',
          label: { content: { value: 'trend' }, position: 'midway', side: 'top', sloped: true },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ]),
      {
        d: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      },
    );

    const [path] = collectPaths(markLayer(root, 0));
    expect(path.label).toEqual({ text: 'trend', position: 'midway', side: 'top', sloped: true });
    expect(path.children.some(step => 'label' in step && step.label !== undefined)).toBe(false);
  });

  it('path-mark-host-geometry-label accepts canonical side names', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'path',
          label: { content: { value: 'trend' }, position: 'midway', side: 'top' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ]),
      {
        d: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      },
    );

    const [path] = collectPaths(markLayer(root, 0));
    expect(path.label).toEqual({ text: 'trend', position: 'midway', side: 'top' });
  });

  it('reference-line-geometry-label：ReferenceMark line 使用 geometry label', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'reference',
          label: { content: { field: 'name' }, position: 'near-end', side: 'bottom' },
          encoding: { y: { value: 5 } },
        },
      ]),
      { d: [{ name: 'target' }] },
    );

    const [path] = collectPaths(markLayer(root, 0));
    expect(path.label).toEqual({ text: 'target', position: 'near-end', side: 'bottom' });
  });

  it('reference-band-node-label：ReferenceMark band 使用 node label', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'reference',
          label: { content: { value: 'safe zone' }, position: { boundary: 'top', fraction: 0.5 }, placement: 'inside' },
          yTo: 7,
          encoding: { y: { value: 3 } },
        },
      ]),
      { d: [{}] },
    );

    const [node] = collectNodes(markLayer(root, 0));
    expect(node.label).toEqual({
      text: 'safe zone',
      position: { boundary: 'top', fraction: 0.5 },
      placement: 'inside',
    });
  });

  it('relation-path-host-label：RelationMark 顶层 label lowering 到 core Path.label', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          source: { project: { x: 'sourceX', y: 'sourceY' } },
          target: { project: { x: 'targetX', y: 'targetY' } },
          label: { content: { field: 'label' }, position: 0.5, side: 'top' },
        },
      ]),
      {
        d: [{ sourceX: 0, sourceY: 0, targetX: 1, targetY: 1, label: 'A to B' }],
      },
    );

    const [path] = collectPaths(markLayer(root, 0));
    expect(path.label).toEqual({ text: 'A to B', position: 0.5, side: 'top' });
    expect(path.children.some(step => 'label' in step && step.label !== undefined)).toBe(false);
  });

  it('relation-ribbon-host-label：RelationMark 顶层 label lowering 到 core ribbon Path.label', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          kind: 'ribbon',
          source: { project: { x: 'sourceX', y: 'sourceY' } },
          target: { project: { x: 'targetX', y: 'targetY' } },
          ribbon: { width: { kind: 'constant', value: 12 } },
          label: { content: { value: 'flow' }, position: 'midway', placement: 'inside', sloped: true },
        },
      ]),
      {
        d: [{ sourceX: 0, sourceY: 0, targetX: 1, targetY: 1 }],
      },
    );

    const [ribbon] = collectPaths(markLayer(root, 0));
    expect(ribbon.kind).toBe('ribbon');
    expect(ribbon.label).toEqual({ text: 'flow', position: 'midway', placement: 'inside', sloped: true });
  });
});
