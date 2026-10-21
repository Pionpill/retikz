import type { IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const opts: LowerPlotsOptions = { layout: { width: 200, height: 100 } };

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = opts,
): IRScope => {
  return lowerPlot(spec, datasets, { ...options, textMeasurer: measureLabel }) as IRScope;
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

const baseSpec = (marks: unknown): IRPlot =>
  PlotSchema.parse({
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
          kind: 'data',
          encodings: { position: { x: 'x', y: 'y' } },
          properties: { label: { content: 'trend', position: 'midway', side: 'top', sloped: true } },
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
          kind: 'data',
          encodings: { position: { x: 'x', y: 'y' } },
          properties: { label: { content: 'trend', position: 'midway', side: 'top' } },
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

  it('wraps a legacy mixed geometry-label line as the Core TextBlock form', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'path',
          kind: 'data',
          encodings: { position: { x: 'x', y: 'y' } },
          properties: { label: { content: { runs: [{ text: 'trend ' }, { tex: 'x' }] }, position: 'midway' } },
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

    expect(path.label).toEqual({ text: [{ runs: [{ text: 'trend ' }, { tex: 'x' }] }], position: 'midway' });
  });

  it('relation-path-host-label：RelationMark 顶层 label lowering 到 core Path.label', () => {
    const root = expandOf(
      baseSpec([
        {
          type: 'relation',
          kind: 'data',
          encodings: {
            source: { position: { x: 'sourceX', y: 'sourceY' } },
            target: { position: { x: 'targetX', y: 'targetY' } },
            label: { content: 'label' },
          },
          properties: { label: { position: 0.5, side: 'top' }, geometry: { kind: 'path' } },
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
          kind: 'data',
          encodings: {
            source: { position: { x: 'sourceX', y: 'sourceY' } },
            target: { position: { x: 'targetX', y: 'targetY' } },
          },
          properties: {
            label: { content: 'flow', position: 'midway', placement: 'inside', sloped: true },
            geometry: { kind: 'ribbon', width: 12 },
          },
        },
      ]),
      {
        d: [{ sourceX: 0, sourceY: 0, targetX: 1, targetY: 1 }],
      },
    );

    const [ribbon] = collectPaths(markLayer(root, 0));

    expect(ribbon.kind).toBe('ribbon');
    expect(ribbon.kindOptions).toMatchObject({ width: { kind: 'fixed', value: 12 } });
    expect(ribbon.label).toEqual({ text: 'flow', position: 'midway', placement: 'inside', sloped: true });
  });
});
