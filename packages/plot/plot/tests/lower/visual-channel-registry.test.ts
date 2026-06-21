import { describe, expect, it } from 'vitest';
import { OPACITY_MIN, PLOT_SHAPE_PALETTE, SIZE_MAX_RADIUS, SIZE_MIN_RADIUS, STROKE_WIDTH_MAX, STROKE_WIDTH_MIN, resolveVisualChannelRegistry } from '../../src/providers';

/**
 * ADR-10：内置视觉通道（size / opacity / strokeWidth / shape）收敛为 VisualChannelDefinition 内部 registry。
 * 本文件锁「声明式契约」（output 判别 union + legend 形态 + 注册成员）；逐行解析行为由 size/opacity/shape-channel
 * 三套 e2e（经 lowerPlots，已用本 registry 分派）覆盖，不在此重复。
 */
describe('visual channel registry（ADR-10 内置视觉通道收敛）', () => {
  const registry = resolveVisualChannelRegistry();

  it('暴露 size / opacity / strokeWidth / shape 四个内置视觉通道', () => {
    expect([...registry.keys()]).toEqual(expect.arrayContaining(['opacity', 'shape', 'size', 'strokeWidth']));
    for (const key of ['size', 'opacity', 'strokeWidth', 'shape'] as const) {
      expect(registry.get(key)?.channel).toBe(key);
      expect(typeof registry.get(key)?.resolve).toBe('function');
      expect(typeof registry.get(key)?.deliver).toBe('function');
    }
  });

  it('size：number 输出 + [MIN, MAX] 半径范围 + size legend', () => {
    const size = registry.get('size');
    expect(size?.output).toEqual({ outputKind: 'number', range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS] });
    expect(size?.legend).toBe('size');
  });

  it('opacity：number 输出 + [OPACITY_MIN, 1] clamp + ramp legend', () => {
    const opacity = registry.get('opacity');
    expect(opacity?.output).toEqual({ outputKind: 'number', range: [OPACITY_MIN, 1], clamp: true });
    expect(opacity?.legend).toBe('ramp');
  });

  it('strokeWidth：number 输出 + [MIN, MAX] clamp + 无 legend（无 descriptor 不进图例）', () => {
    const strokeWidth = registry.get('strokeWidth');
    expect(strokeWidth?.output).toEqual({ outputKind: 'number', range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true });
    expect(strokeWidth?.legend).toBeUndefined();
  });

  it('shape：symbol 输出 + glyph palette + symbol legend（复用 ordinal 数学）', () => {
    const shape = registry.get('shape');
    expect(shape?.output).toEqual({ outputKind: 'symbol', palette: [...PLOT_SHAPE_PALETTE] });
    expect(shape?.legend).toBe('symbol');
  });

  it('size 常量编码：直接产最终半径、无 descriptor（不入 legend）', () => {
    const size = registry.get('size');
    expect(size).toBeDefined();
    const resolve = size!.resolve({
      node: { namespace: 'plot', type: 'plot', data: { reference: 'd' }, scales: [], coordinate: { type: 'cartesian2D', x: 'x', y: 'y' }, marks: [] },
      rows: [],
      fieldTypes: new Map(),
    });
    const resolution = resolve({ type: 'point', size: { kind: 'constant', value: 7 }, encoding: {} });
    expect(resolution?.of({})).toBe(7);
    expect(resolution?.descriptor).toBeUndefined();
  });
});
