import type { IRNode, IRPath } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { AxesDefinition, createAxes, lowerAxes } from '../../../src';

const endpoints = (path: IRPath) => path.children.map(step => ('to' in step ? step.to : undefined));

describe('lowerAxes', () => {
  it('lowers grid, axes, ticks, and labels in stable layer order', () => {
    const lowered = lowerAxes(
      createAxes({
        bounds: { x: { min: -2, max: 2 }, y: { min: -1, max: 1 } },
        grid: {
          spacing: 1,
          style: { stroke: '#e2e8f0', strokeWidth: 0.5 },
          vertical: { stroke: '#cbd5e1' },
          horizontal: { dashPattern: [4, 2] },
        },
        ticks: { x: 1, y: 1, size: 2, style: { strokeWidth: 2 } },
      }),
    );

    expect(lowered).toHaveLength(18);
    expect(lowered.slice(0, 5)).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'path', stroke: '#cbd5e1', strokeWidth: 0.5 })]),
    );
    expect(lowered.slice(5, 8)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'path', stroke: '#e2e8f0', strokeWidth: 0.5, dashPattern: [4, 2] }),
      ]),
    );

    const xAxis = lowered[8] as IRPath;
    const yAxis = lowered[9] as IRPath;
    expect(endpoints(xAxis)).toEqual([
      [-2, 0],
      [2, 0],
    ]);
    expect(endpoints(yAxis)).toEqual([
      [0, -1],
      [0, 1],
    ]);
    expect(xAxis.marks).toEqual([{ pos: 1, mark: { kind: 'arrow' } }]);
    expect(yAxis.marks).toEqual([{ pos: 1, mark: { kind: 'arrow' } }]);

    const labels = lowered.slice(-2) as Array<IRNode>;
    expect(labels).toEqual([
      { type: 'node', position: [10, 0], text: 'x', strokeWidth: 0, padding: 0, zIndex: 1 },
      { type: 'node', position: [0, 9], text: 'y', strokeWidth: 0, padding: 0, zIndex: 1 },
    ]);
  });

  it('uses both endpoint marks for bidirectional axes and no marks for plain axes', () => {
    const both = lowerAxes(
      createAxes({
        bounds: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } },
        axes: { arrows: 'both' },
        labels: { x: null, y: null },
      }),
    ) as Array<IRPath>;
    const none = lowerAxes(
      createAxes({
        bounds: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } },
        axes: { arrows: 'none' },
        labels: { x: null, y: null },
      }),
    ) as Array<IRPath>;

    expect(both[0]?.marks?.map(mark => mark.pos)).toEqual([0, 1]);
    expect(both[1]?.marks?.map(mark => mark.pos)).toEqual([0, 1]);
    expect(none[0]?.marks).toBeUndefined();
    expect(none[1]?.marks).toBeUndefined();
  });

  it('enumerates one-axis ticks from origin, excludes origin, and keeps closed-interval endpoints', () => {
    const lowered = lowerAxes(
      createAxes({
        bounds: { x: { min: -3, max: 5 }, y: { min: -2, max: 2 } },
        origin: [1, 0],
        axes: { arrows: 'none' },
        ticks: { x: 2, size: 4 },
        labels: { x: null, y: null },
      }),
    );

    const ticks = lowered.slice(2) as Array<IRPath>;
    expect(ticks.map(path => endpoints(path)[0])).toEqual([
      [-3, -2],
      [-1, -2],
      [3, -2],
      [5, -2],
    ]);
  });

  it('suppresses only the axis label explicitly set to null', () => {
    const lowered = lowerAxes(
      createAxes({
        bounds: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } },
        labels: { x: null, y: 'height' },
      }),
    );

    expect(lowered.filter(child => child.type === 'node')).toEqual([
      { type: 'node', position: [0, 9], text: 'height', strokeWidth: 0, padding: 0, zIndex: 1 },
    ]);
  });

  it('compiles through the registered Axes definition without diagnostics', () => {
    const warnings: Array<string> = [];
    const scene = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          createAxes({
            bounds: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } },
            axes: { arrows: 'none' },
            labels: { x: null, y: null },
          }),
        ],
      },
      { composites: [AxesDefinition], onWarn: warning => warnings.push(warning.code) },
    );

    expect(warnings).toEqual([]);
    expect(scene.primitives.filter(primitive => primitive.type === 'path')).toHaveLength(2);
  });

  it('keeps Core diagnostics for direct Axes IR without its definition', () => {
    const warnings: Array<string> = [];
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          createAxes({ bounds: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } } }),
          { type: 'node', position: [4, 4], text: 'kept' },
        ],
      },
      { onWarn: warning => warnings.push(warning.code) },
    );

    expect(warnings).toContain('COMPOSITE_NOT_REGISTERED');
  });
});
