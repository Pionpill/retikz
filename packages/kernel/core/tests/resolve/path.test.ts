import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../src';
import type { IRPathBase, IRScene, IRStep } from '../../src/schemas';
import { resolvePathWithBuiltinProviders, resolveStrokePathWithBuiltinProviders } from './path-helper';

const path = (overrides: Partial<IRPathBase> = {}): IRPathBase => ({
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: [10, 0] },
  ],
  ...overrides,
});

const sceneWith = (pathValue: IRPathBase): IRScene => ({
  version: 1,
  type: 'scene',
  children: [pathValue],
});

describe('resolvePath', () => {
  it('解决有效宽度和描边绘制默认值，而不更改显式值', () => {
    const resolved = resolvePathWithBuiltinProviders(path(), { irPath: ['children', 2] });
    expect(resolved.irPath).toEqual(['children', 2]);
    expect(resolved.path.strokeWidth).toBe(1);
    expect(resolveStrokePathWithBuiltinProviders(path()).path).toMatchObject({
      strokeWidth: 1,
      fill: 'none',
      stroke: 'currentColor',
    });
    expect(
      resolveStrokePathWithBuiltinProviders(
        path({
          style: { strokeWidth: 2, fill: 'gold', stroke: 'none' },
        }),
      ).path,
    ).toMatchObject({ strokeWidth: 2, fill: 'gold', stroke: 'none' });
  });

  it('扩展弯曲和形状闭合默认值，同时保留显式值', () => {
    const canonical = resolvePathWithBuiltinProviders(
      path({
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'bend', to: [10, 0] },
          { type: 'step', kind: 'bend', to: [20, 0], bendDirection: 'right', bendAngle: -15 },
          { type: 'step', kind: 'circlePath', radius: 5, startAngle: 0, endAngle: 90 },
          { type: 'step', kind: 'ellipsePath', radius: { x: 5, y: 3 }, closed: 'open' },
        ],
      }),
    );

    expect(canonical.path.children![1]).toMatchObject({ kind: 'bend', bendDirection: 'left', bendAngle: 30 });
    expect(canonical.path.children![2]).toMatchObject({ kind: 'bend', bendDirection: 'right', bendAngle: -15 });
    expect(canonical.path.children![3]).toMatchObject({ kind: 'circlePath', closed: 'chord' });
    expect(canonical.path.children![4]).toMatchObject({ kind: 'ellipsePath', closed: 'open' });
  });

  it('在不更改几何输入的情况下扩展折叠和平滑静态默认值', () => {
    const canonical = resolvePathWithBuiltinProviders(
      path({
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'fold', via: '-|-', to: [10, 10] },
          { type: 'step', kind: 'smooth', points: [[20, 20]] },
        ],
      }),
    );

    expect(canonical.path.children![1]).toMatchObject({ kind: 'fold', fraction: 0.5 });
    expect(canonical.path.children![2]).toMatchObject({ kind: 'smooth', tension: 1 });
    expect(canonical.path.children![0]).toMatchObject({ to: [0, 0] });
  });

  it('规范化每个几何标签位置、边和距离', () => {
    const positions = [
      'at-start',
      'very-near-start',
      'near-start',
      'midway',
      'near-end',
      'very-near-end',
      'at-end',
    ] as const;
    const expected = [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1];
    const children: Array<IRStep> = positions.map((position, index) => ({
      type: 'step' as const,
      kind: 'line' as const,
      to: [index + 1, 0] as [number, number],
      label: { text: position, position } as const,
    }));
    const canonical = resolvePathWithBuiltinProviders(
      path({ children: [{ type: 'step', kind: 'move', to: [0, 0] }, ...children] }),
    );

    for (const [index, step] of canonical.path.children!.slice(1).entries()) {
      expect(step).toMatchObject({ label: { position: expected[index], side: 'top', distance: 4 } });
    }

    expect(
      resolvePathWithBuiltinProviders(
        path({
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'line',
              to: [1, 0],
              label: { text: 'sloped', sloped: true },
            },
          ],
        }),
      ).path.children![1],
    ).toMatchObject({ label: { position: 0.5, side: 'center', distance: 4 } });
  });

  it('实现宿主和步骤标签的中断默认值和显式覆盖', () => {
    const canonical = resolvePathWithBuiltinProviders(
      path({
        label: [
          { text: 'center', sloped: true },
          { text: 'above', side: 'top' },
          { text: 'force', side: 'bottom', interrupt: true },
          { text: 'continuous', sloped: true, interrupt: false },
        ],
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0], label: { text: 'sloped', sloped: true } },
          { type: 'step', kind: 'line', to: [20, 0], label: { text: 'step-above', side: 'top' } },
          {
            type: 'step',
            kind: 'line',
            to: [30, 0],
            label: { text: 'step-continuous', sloped: true, interrupt: false },
          },
        ],
      }),
    );

    expect(canonical.path.label).toMatchObject([
      { text: 'center', side: 'center', interrupt: true },
      { text: 'above', side: 'top', interrupt: false },
      { text: 'force', side: 'bottom', interrupt: true },
      { text: 'continuous', side: 'center', interrupt: false },
    ]);
    expect(canonical.path.children).toMatchObject([
      { kind: 'move' },
      { kind: 'line', label: { text: 'sloped', side: 'center', interrupt: true } },
      { kind: 'line', label: { text: 'step-above', side: 'top', interrupt: false } },
      { kind: 'line', label: { text: 'step-continuous', side: 'center', interrupt: false } },
    ]);
  });

  it('将宿主标签标准化为数组，同时保留显式的虚假值', () => {
    const canonical = resolvePathWithBuiltinProviders(
      path({ label: { text: 'host', position: 'at-end', side: 'bottom', distance: 0, sloped: false } }),
    );

    expect(canonical.path.label).toEqual([
      { text: 'host', position: 1, side: 'bottom', distance: 0, sloped: false, interrupt: false, gap: 4 },
    ]);
  });

  it('将紧凑的 Path 形式编译为与其显式 Source IR 等效项相同的 Scene', () => {
    const compact = path({
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        {
          type: 'step',
          kind: 'fold',
          via: '-|-',
          to: [10, 10],
          label: { text: 'fold', position: 'at-end' },
        },
        { type: 'step', kind: 'smooth', points: [[20, 20]], label: { text: 'smooth' } },
      ],
    });
    const expanded = path({
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        {
          type: 'step',
          kind: 'fold',
          via: '-|-',
          fraction: 0.5,
          to: [10, 10],
          label: { text: 'fold', position: 1, side: 'top', distance: 4 },
        },
        {
          type: 'step',
          kind: 'smooth',
          points: [[20, 20]],
          tension: 1,
          label: { text: 'smooth', position: 0.5, side: 'top', distance: 4 },
        },
      ],
    });

    expect(compileToScene(sceneWith(compact)).scene).toEqual(compileToScene(sceneWith(expanded)).scene);
  });

  it('编译紧凑弯曲和部分形状默认值，就像它们的显式形式一样', () => {
    const compact = path({
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'bend', to: [10, 0] },
        { type: 'step', kind: 'circlePath', radius: 5, startAngle: 0, endAngle: 90 },
        { type: 'step', kind: 'ellipsePath', radius: { x: 6, y: 3 }, startAngle: 0, endAngle: 180 },
      ],
    });
    const expanded = path({
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'bend', to: [10, 0], bendDirection: 'left', bendAngle: 30 },
        { type: 'step', kind: 'circlePath', radius: 5, startAngle: 0, endAngle: 90, closed: 'chord' },
        {
          type: 'step',
          kind: 'ellipsePath',
          radius: { x: 6, y: 3 },
          startAngle: 0,
          endAngle: 180,
          closed: 'chord',
        },
      ],
    });

    expect(compileToScene(sceneWith(compact)).scene).toEqual(compileToScene(sceneWith(expanded)).scene);
  });
});
