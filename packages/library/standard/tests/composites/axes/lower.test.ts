import type { IRNode, IRPath, ScenePrimitive } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { AxesDefinition, createAxes, lowerAxes } from '../../../src';
import { fullScopeProps } from '../presentation/scope-props';

const endpoints = (path: IRPath) => path.children.map(step => ('to' in step ? step.to : undefined));
const lowerAxesChildren = (input: Parameters<typeof lowerAxes>[0]): Array<IRNode | IRPath> =>
  lowerAxes(input).children as Array<IRNode | IRPath>;
const scenePathsOf = (children: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  children.flatMap(child =>
    child.type === 'path' ? [child] : child.type === 'group' ? scenePathsOf(child.children) : [],
  );

const hiddenAxis = { extent: 20, line: false, ticks: false, grid: false, label: false } as const;

describe('lowerAxes', () => {
  it('lowers asymmetric extents, independent grids, axes, ticks, and static labels in stable order', () => {
    const lowered = lowerAxesChildren(
      createAxes({
        origin: {
          position: [100, 80],
          label: '0',
        },
        x: {
          extent: { negative: 40, positive: 60 },
          grid: { spacing: 20, style: { stroke: '#e2e8f0' } },
          ticks: {
            source: { kind: 'spacing', spacing: 20 },
            endpointGap: 0,
            labels: {
              entries: [
                { value: -20, text: '−1' },
                { value: 40, text: '2' },
              ],
              style: { textColor: '#0f172a' },
            },
          },
        },
        y: {
          extent: { negative: 20, positive: 40 },
          grid: { spacing: 20, style: { stroke: '#e2e8f0' } },
          ticks: {
            source: { kind: 'values', values: [-20, 20, 40] },
            endpointGap: 0,
            labels: { entries: [{ value: 20, text: '1' }] },
          },
          label: { text: 'y', end: 'negative', offset: 10 },
        },
      }),
    );

    expect(lowered).toHaveLength(26);
    expect(lowered.slice(0, 10)).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'path', stroke: '#e2e8f0' })]),
    );

    const xAxis = lowered[10] as IRPath;
    const yAxis = lowered[11] as IRPath;
    expect(endpoints(xAxis)).toEqual([
      [60, 80],
      [160, 80],
    ]);
    expect(endpoints(yAxis)).toEqual([
      [100, 100],
      [100, 40],
    ]);
    expect(xAxis.marks).toEqual([{ pos: 1, mark: { kind: 'arrow' } }]);
    expect(yAxis.marks).toEqual([{ pos: 1, mark: { kind: 'arrow' } }]);

    const tickPaths = lowered.slice(12, 20) as Array<IRPath>;
    expect(tickPaths.map(path => endpoints(path)[0])).toEqual([
      [60, 77],
      [80, 77],
      [120, 77],
      [140, 77],
      [160, 77],
      [100 - 3, 100],
      [100 - 3, 60],
      [100 - 3, 40],
    ]);

    expect(lowered.slice(20)).toEqual([
      {
        type: 'node',
        position: [80, 87],
        text: '−1',
        textColor: '#0f172a',
        strokeWidth: 0,
        padding: 0,
        zIndex: 1,
      },
      { type: 'node', position: [140, 87], text: '2', textColor: '#0f172a', strokeWidth: 0, padding: 0, zIndex: 1 },
      { type: 'node', position: [93, 60], text: '1', strokeWidth: 0, padding: 0, zIndex: 1 },
      { type: 'node', position: [168, 80], text: 'x', strokeWidth: 0, padding: 0, zIndex: 1 },
      { type: 'node', position: [100, 110], text: 'y', strokeWidth: 0, padding: 0, zIndex: 1 },
      { type: 'node', position: [90, 90], text: '0', strokeWidth: 0, padding: 0, zIndex: 1 },
    ] satisfies Array<IRNode>);
  });

  it('preserves authored Scope props on one stable root', () => {
    const lowered = lowerAxes(
      createAxes({
        ...fullScopeProps,
        x: { extent: 20, label: false },
        y: { extent: 20, label: false },
      }),
    );

    expect(lowered).toMatchObject({ type: 'scope', ...fullScopeProps });
    expect(lowered.children).toHaveLength(2);
    expect(lowered.children.every(child => child.id === undefined)).toBe(true);
  });

  it('places arrow marks at independently configured axis endpoints', () => {
    const lowered = lowerAxesChildren(
      createAxes({
        x: { extent: 20, line: { arrows: 'negative' }, label: false },
        y: { extent: 20, line: { arrows: 'both' }, label: false },
      }),
    ) as Array<IRPath>;

    expect(lowered[0]?.marks).toEqual([{ pos: 0, mark: { kind: 'arrow' } }]);
    expect(lowered[1]?.marks).toEqual([
      { pos: 0, mark: { kind: 'arrow' } },
      { pos: 1, mark: { kind: 'arrow' } },
    ]);
  });

  it('merges shared and endpoint arrow details onto negative and positive marks', () => {
    const lowered = lowerAxesChildren(
      createAxes({
        x: {
          extent: 20,
          line: {
            arrows: 'both',
            arrowDetail: {
              shape: 'openStealth',
              scale: 1.5,
              color: '#0f172a',
              start: { width: 8 },
              end: { length: 10, opacity: 0.7 },
            },
          },
          label: false,
        },
        y: hiddenAxis,
      }),
    ) as Array<IRPath>;

    expect(lowered[0]?.marks).toEqual([
      {
        pos: 0,
        mark: { kind: 'arrow', shape: 'openStealth', scale: 1.5, color: '#0f172a', width: 8 },
      },
      {
        pos: 1,
        mark: { kind: 'arrow', shape: 'openStealth', scale: 1.5, color: '#0f172a', length: 10, opacity: 0.7 },
      },
    ]);
  });

  it('uses independent axis-local grid offsets without moving the shared origin or extents', () => {
    const lowered = lowerAxesChildren(
      createAxes({
        origin: { position: [100, 80] },
        x: {
          extent: 20,
          line: false,
          grid: { spacing: 10, offset: 5, style: { stroke: '#ef4444' } },
          label: false,
        },
        y: {
          extent: 20,
          line: false,
          grid: { spacing: 10, offset: -5, style: { stroke: '#3b82f6' } },
          label: false,
        },
      }),
    ) as Array<IRPath>;

    expect(lowered.map(path => endpoints(path))).toEqual([
      [
        [85, 60],
        [85, 100],
      ],
      [
        [95, 60],
        [95, 100],
      ],
      [
        [105, 60],
        [105, 100],
      ],
      [
        [115, 60],
        [115, 100],
      ],
      [
        [80, 95],
        [120, 95],
      ],
      [
        [80, 85],
        [120, 85],
      ],
      [
        [80, 75],
        [120, 75],
      ],
      [
        [80, 65],
        [120, 65],
      ],
    ]);
    expect(lowered[0].stroke).toBe('#ef4444');
    expect(lowered[4].stroke).toBe('#3b82f6');
  });

  it('supports a single number line and keeps ticks when its line is hidden', () => {
    const numberLine = lowerAxesChildren(
      createAxes({
        origin: { position: [50, 40] },
        x: {
          extent: 30,
          line: { arrows: 'both' },
          ticks: { source: { kind: 'spacing', spacing: 10, extent: 'positive' }, endpointGap: 0 },
          label: 't',
        },
        y: hiddenAxis,
      }),
    );
    const hiddenLine = lowerAxesChildren(
      createAxes({
        origin: { position: [50, 40] },
        x: {
          extent: 30,
          line: false,
          ticks: { source: { kind: 'values', values: [-20, 20] } },
          label: false,
        },
        y: hiddenAxis,
      }),
    );

    expect(numberLine.filter(child => child.type === 'path')).toHaveLength(4);
    expect(numberLine.filter(child => child.type === 'node')).toEqual([
      { type: 'node', position: [88, 40], text: 't', strokeWidth: 0, padding: 0, zIndex: 1 },
    ]);
    expect(hiddenLine).toHaveLength(2);
    expect((hiddenLine[0] as IRPath).marks).toBeUndefined();
  });

  it('places tick segments on the configured perpendicular side and keeps labels on their default side', () => {
    const lowered = lowerAxesChildren(
      createAxes({
        origin: { position: [50, 40] },
        x: {
          extent: 20,
          line: false,
          ticks: {
            source: { kind: 'values', values: [10] },
            side: 'positive',
            length: 6,
            labels: { entries: [{ value: 10, text: 'x' }], offset: 4 },
          },
          label: false,
        },
        y: {
          extent: 20,
          line: false,
          ticks: {
            source: { kind: 'values', values: [10] },
            side: 'negative',
            length: 6,
            labels: { entries: [{ value: 10, text: 'y' }], offset: 4 },
          },
          label: false,
        },
      }),
    );

    expect(endpoints(lowered[0] as IRPath)).toEqual([
      [60, 34],
      [60, 40],
    ]);
    expect(endpoints(lowered[1] as IRPath)).toEqual([
      [44, 30],
      [50, 30],
    ]);
    expect(lowered.slice(2)).toEqual([
      { type: 'node', position: [60, 44], text: 'x', strokeWidth: 0, padding: 0, zIndex: 1 },
      { type: 'node', position: [40, 30], text: 'y', strokeWidth: 0, padding: 0, zIndex: 1 },
    ] satisfies Array<IRNode>);
  });

  it('filters spacing and explicit ticks near either endpoint while preserving the exact gap boundary', () => {
    const lowered = lowerAxesChildren(
      createAxes({
        origin: { position: [30, 30] },
        x: {
          extent: 20,
          line: false,
          ticks: {
            source: { kind: 'values', values: [-20, -14, -13, 13, 14, 20] },
            endpointGap: 6,
          },
          label: false,
        },
        y: {
          extent: 20,
          line: false,
          ticks: { source: { kind: 'spacing', spacing: 10 } },
          label: false,
        },
      }),
    ) as Array<IRPath>;

    expect(lowered).toHaveLength(6);
    expect(lowered.map(path => endpoints(path)[0])).toEqual([
      [16, 27],
      [17, 27],
      [43, 27],
      [44, 27],
      [27, 40],
      [27, 20],
    ]);
  });

  it('keeps endpoint ticks when endpointGap is zero', () => {
    const lowered = lowerAxesChildren(
      createAxes({
        origin: { position: [30, 30] },
        x: {
          extent: 20,
          line: false,
          ticks: { source: { kind: 'values', values: [-20, 20] }, endpointGap: 0 },
          label: false,
        },
        y: hiddenAxis,
      }),
    ) as Array<IRPath>;

    expect(lowered.map(path => endpoints(path)[0])).toEqual([
      [10, 27],
      [50, 27],
    ]);
  });

  it('uses a ten-unit origin-label offset for shorthand text', () => {
    const lowered = lowerAxesChildren(
      createAxes({
        origin: { position: [50, 40], label: '0' },
        x: { extent: 20, line: false, label: false },
        y: hiddenAxis,
      }),
    );

    expect(lowered).toEqual([
      { type: 'node', position: [40, 50], text: '0', strokeWidth: 0, padding: 0, zIndex: 1 },
    ] satisfies Array<IRNode>);
  });

  it('compiles through the registered Axes definition without diagnostics', () => {
    const warnings: Array<string> = [];
    const scene = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          createAxes({
            x: { extent: 20, label: false },
            y: { extent: 20, label: false },
          }),
        ],
      },
      { composites: [AxesDefinition], onWarn: warning => warnings.push(warning.code) },
    ).scene;

    expect(warnings).toEqual([]);
    expect(scenePathsOf(scene.primitives)).toHaveLength(2);
  });

  it('keeps Core diagnostics for direct Axes IR without its definition', () => {
    const warnings: Array<string> = [];
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          createAxes({ x: { extent: 20 }, y: { extent: 20 } }),
          { type: 'node', position: [4, 4], text: 'kept' },
        ],
      },
      { onWarn: warning => warnings.push(warning.code) },
    );

    expect(warnings).toContain('COMPOSITE_NOT_REGISTERED');
  });
});
