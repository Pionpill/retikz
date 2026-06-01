import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { ArrowEndSpec, MarkerPathCommand } from '@retikz/core';
import { ArrowMarker } from '../../src/render/arrowMarkers';

type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

/**
 * Arrow marker 物化对抗回归（ADR-01 emit-in-compile）
 * @description 坏 ArrowEndSpec（NaN refX / Infinity baseSize / text 注入）已由 compile 运行时栅栏在源头拦下
 *   （见 core 侧 builtin-registry.adversarial），react 作纯物化层不重复兜底。这里保留 marker 几何里 arc /
 *   ellipseArc 命令的物化回归——`MarkerPathCommand` 与 Scene `PathCommand` 同词汇，react 复用 buildPathD
 *   产 SVG A 段（曾经被静默丢弃，现已补齐）。
 */

const spec = (overrides: Partial<ArrowEndSpec> = {}): ArrowEndSpec => ({
  shape: 'custom',
  baseSize: 10,
  refX: 0,
  markerWidth: 6,
  markerHeight: 6,
  marker: [],
  ...overrides,
});

const render = (s: ArrowEndSpec, id = 'mk'): AnyEl =>
  ArrowMarker({ id, spec: s }) as unknown as AnyEl;

describe('arrow marker arc 物化', () => {
  it('marker path 用 arc 命令 → 物化出 SVG A 段（不再静默丢）', () => {
    const arcCmds: Array<MarkerPathCommand> = [
      { kind: 'move', to: [0, 5] },
      { kind: 'arc', center: [5, 5], radius: 5, startAngle: 180, endAngle: 0 },
      { kind: 'close' },
    ];
    const el = render(spec({ marker: [{ type: 'path', commands: arcCmds, fill: 'red' }] }));
    const children = el.props.children as Array<AnyEl>;
    const d = children[0].props.d as string;
    expect(d).toContain('A');
    expect(d.startsWith('M 0 5')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('marker path 用 ellipseArc 命令 → 物化出带 rotation 的 A 段', () => {
    const cmds: Array<MarkerPathCommand> = [
      { kind: 'move', to: [0, 5] },
      { kind: 'ellipseArc', center: [5, 5], radiusX: 5, radiusY: 3, startAngle: 180, endAngle: 0 },
    ];
    const el = render(spec({ marker: [{ type: 'path', commands: cmds, stroke: 'blue' }] }));
    const children = el.props.children as Array<AnyEl>;
    expect((children[0].props.d as string)).toContain('A 5 3');
  });
});
