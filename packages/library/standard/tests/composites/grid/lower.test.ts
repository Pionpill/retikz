import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { createGrid, lowerGrid } from '../../../src';

describe('GridDefinition', () => {
  it('lowers a uniform grid to ordered Core paths', () => {
    const lowered = lowerGrid(
      createGrid({
        bounds: { min: [0, 0], max: [20, 10] },
        spacing: 10,
      }),
    );

    expect(lowered).toEqual([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [0, 10] },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [10, 0] },
          { type: 'step', kind: 'line', to: [10, 10] },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [20, 0] },
          { type: 'step', kind: 'line', to: [20, 10] },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [20, 0] },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 10] },
          { type: 'step', kind: 'line', to: [20, 10] },
        ],
      },
    ]);
  });

  it('keeps major identity origin-relative when boundary insertion changes output positions', () => {
    const lowered = lowerGrid(
      createGrid({
        bounds: { min: [1, 0], max: [25, 10] },
        spacing: 10,
        origin: [0, 0],
        lines: { horizontal: false, includeBoundary: true, style: { stroke: '#cbd5e1', strokeWidth: 0.5 } },
        major: { every: 2, style: { strokeWidth: 2 } },
      }),
    );

    expect(
      lowered.map(path => {
        const firstStep = path.children[0];
        return {
          stroke: path.stroke,
          strokeWidth: path.strokeWidth,
          from: 'to' in firstStep ? firstStep.to : undefined,
        };
      }),
    ).toEqual([
      { stroke: '#cbd5e1', strokeWidth: 0.5, from: [1, 0] },
      { stroke: '#cbd5e1', strokeWidth: 0.5, from: [10, 0] },
      { stroke: '#cbd5e1', strokeWidth: 2, from: [20, 0] },
      { stroke: '#cbd5e1', strokeWidth: 0.5, from: [25, 0] },
    ]);
  });

  it('emits an extended behind border before grid lines', () => {
    const lowered = lowerGrid(
      createGrid({
        bounds: { min: [0, 0], max: [10, 10] },
        spacing: 10,
        lines: { horizontal: false },
        border: {
          padding: 2,
          order: 'behind',
          extendLines: true,
          style: { stroke: '#64748b' },
        },
      }),
    );

    expect(lowered[0]?.stroke).toBe('#64748b');
    expect(lowered[0]?.children.map(step => ('to' in step ? step.to : undefined))).toEqual([
      [-2, -2],
      [12, -2],
      [12, 12],
      [-2, 12],
      undefined,
    ]);
    expect(lowered[1]?.children).toEqual([
      { type: 'step', kind: 'move', to: [0, -2] },
      { type: 'step', kind: 'line', to: [0, 12] },
    ]);
  });

  it('keeps Core diagnostics for direct Grid IR without its definition', () => {
    const warnings: Array<string> = [];
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [createGrid({ bounds: { min: [0, 0], max: [10, 10] }, spacing: 10 })],
      },
      {
        onWarn: warning => warnings.push(warning.code),
      },
    );

    expect(warnings).toContain('COMPOSITE_NOT_REGISTERED');
  });

  it('fails fast when unchecked IR would produce non-finite lattice indices', () => {
    expect(() =>
      lowerGrid({
        namespace: 'standard',
        type: 'grid',
        bounds: { min: [-1, -1], max: [1, 1] },
        spacing: Number.MIN_VALUE,
        lines: { vertical: true, horizontal: true, includeBoundary: false },
      }),
    ).toThrow(/finite safe integers/i);
  });
});
