import { describe, expect, it } from 'vitest';

import { createGrid, GridSchema, lowerGrid } from '../../../src/presentation';
import { resolveGrid } from '../../../src/presentation/grid/resolve';
import { fullScopeProps } from '../presentation/scope-props';

const base = (overrides: Record<string, unknown> = {}) => ({
  namespace: 'standard' as const,
  type: 'grid' as const,
  bounds: { start: [0, 0], end: [120, 80] },
  ...overrides,
});

describe('GridSchema', () => {
  it('保持工厂和持久源稀疏，同时解决与默认相关的限制', () => {
    const source = createGrid({ bounds: { start: [0, 0], end: [120, 80] }, line: { major: { every: 2 } }, border: {} });

    expect(resolveGrid(GridSchema.parse(JSON.parse(JSON.stringify(source))))).toEqual({
      ...resolveGrid(source),
      position: [0, 0],
    });
    expect(source.line).toEqual({ major: { every: 2 } });
    expect(resolveGrid(source)).toMatchObject({
      line: { vertical: { spacing: 10, origin: 0, includeBoundary: false, major: { offset: 0 } } },
      border: { padding: 0, order: 'front', extendLines: false },
    });

    const excessive = GridSchema.parse(base({ line: { spacing: 0.000001 } }));

    expect(() => lowerGrid(excessive)).toThrow(/exceeds/);
    expect(() =>
      lowerGrid(createGrid({ bounds: { start: [0, 0], end: [120, 80] }, line: { spacing: 0.000001 } })),
    ).toThrow(/exceeds/);
  });

  it('重用完整的 Core Scope 编写的曲面', () => {
    const parsed = GridSchema.parse({
      namespace: 'standard',
      type: 'grid',
      ...fullScopeProps,
      bounds: { start: [0, 0], end: [20, 10] },
    });

    expect(parsed).toMatchObject(fullScopeProps);
    expect(GridSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('保留省略的行并解析两个默认方向', () => {
    const result = GridSchema.safeParse(base());

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.bounds).toEqual({ start: [0, 0], end: [120, 80] });
      expect(result.data.line).toBe(true);
      expect(resolveGrid(result.data).line).toMatchObject({ vertical: { spacing: 10 }, horizontal: { spacing: 10 } });
    }
  });

  it('解析具有间距、原点、主要和边框样式的共享线条对象', () => {
    const result = GridSchema.safeParse(
      base({
        line: {
          spacing: 10,
          origin: 5,
          includeBoundary: true,
          style: { stroke: '#cbd5e1', strokeWidth: 0.5 },
          major: { every: 5, style: { strokeWidth: 1.5 } },
        },
        border: { padding: 4, style: { stroke: '#64748b', fill: '#fff' } },
      }),
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.line).toEqual({
        spacing: 10,
        origin: 5,
        includeBoundary: true,
        style: { stroke: '#cbd5e1', strokeWidth: 0.5 },
        major: { every: 5, offset: 0, style: { strokeWidth: 1.5 } },
      });
      expect(result.data.border?.style).toEqual({ stroke: '#64748b', fill: '#fff' });
    }
  });

  it('解析独立的垂直和水平线配置', () => {
    const result = GridSchema.safeParse(
      base({
        line: {
          vertical: { spacing: 10, origin: 0, style: { stroke: '#ef4444' } },
          horizontal: { spacing: 20, origin: 5, style: { stroke: '#3b82f6' } },
        },
      }),
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.line).toEqual({
        vertical: { spacing: 10, origin: 0, includeBoundary: false, style: { stroke: '#ef4444' } },
        horizontal: { spacing: 20, origin: 5, includeBoundary: false, style: { stroke: '#3b82f6' } },
      });
    }
  });

  it('接受 false 行，同时保留独立边框', () => {
    const result = GridSchema.safeParse(base({ line: false, border: { padding: 4, style: { stroke: '#64748b' } } }));

    expect(result.success).toBe(true);

    if (result.success) expect(result.data.line).toBe(false);
  });

  it('接受反向且相等的笛卡尔角，无需订购验证', () => {
    expect(GridSchema.safeParse(base({ bounds: { start: [20, 10], end: [0, 0] } })).success).toBe(true);
    expect(GridSchema.safeParse(base({ bounds: { start: [0, 0], end: [0, 10] } })).success).toBe(true);
    expect(GridSchema.safeParse(base({ bounds: { start: [20, 10], end: [0, 10] } })).success).toBe(true);
  });

  it('用笛卡尔和 PolarPosition 中心解析中心加大小边界', () => {
    const centered = GridSchema.safeParse(base({ bounds: { position: [100, 60], width: 80, height: 40 } }));
    const polar = GridSchema.safeParse(
      base({ bounds: { position: { origin: 'anchor', angle: 0, radius: 30 }, width: 80, height: 40 } }),
    );

    expect(centered.success).toBe(true);
    expect(polar.success).toBe(true);
  });

  it('接受零大小的中心尺寸作为简并边界', () => {
    expect(GridSchema.safeParse(base({ bounds: { position: [10, 5], width: 0, height: 10 } })).success).toBe(true);
    expect(GridSchema.safeParse(base({ bounds: { position: [10, 5], width: 20, height: 0 } })).success).toBe(true);
  });

  it('拒绝 PolarPosition 角点、过时的顶级线字段和负尺寸', () => {
    const polarCorner = GridSchema.safeParse(
      base({ bounds: { start: { origin: [0, 0], angle: 0, radius: 10 }, end: [10, 10] } }),
    );
    const obsoleteBounds = GridSchema.safeParse(base({ bounds: { min: [0, 0], max: [10, 10] } }));
    const obsoleteFields = [
      { spacing: 10 },
      { origin: [0, 5] },
      { lines: { style: { stroke: '#cbd5e1' } } },
      { major: { every: 2 } },
    ].map(fields => GridSchema.safeParse(base(fields)));
    const negativeDimension = GridSchema.safeParse(base({ bounds: { position: [0, 0], width: -1, height: 10 } }));

    expect(polarCorner.success).toBe(false);
    expect(obsoleteBounds.success).toBe(false);
    expect(obsoleteFields.every(result => !result.success)).toBe(true);
    expect(negativeDimension.success).toBe(false);
  });

  it('保留递归 PolarPosition 中心输入，而不在 Standard 中解析它', () => {
    const result = GridSchema.safeParse(
      base({
        bounds: {
          position: { origin: { origin: [10, 5], angle: 90, radius: 10 }, angle: 0, radius: 20 },
          width: 80,
          height: 40,
        },
      }),
    );

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.bounds).toEqual({
        position: { origin: { origin: [10, 5], angle: 90, radius: 10 }, angle: 0, radius: 20 },
        width: 80,
        height: 40,
      });
    }
  });

  it('拒绝其输入路径中的未知嵌套样式字段', () => {
    const unknownStyle = GridSchema.safeParse(base({ line: { style: { strokeWidth: 1, unsupported: true } } }));

    expect(unknownStyle.success).toBe(false);

    if (!unknownStyle.success) {
      const issue = unknownStyle.error.issues[0];

      expect(issue.code).toBe('invalid_union');

      if (issue.code === 'invalid_union') {
        expect(issue.errors[1]?.[0]?.path).toEqual(['style']);
      }
    }
  });

  it('拒绝超过两种边界形式的有界下沉尺寸的晶格配置', () => {
    const corner = GridSchema.safeParse(
      base({ bounds: { start: [0, 0], end: [1, 1] }, line: { spacing: 0.000001, origin: 0, includeBoundary: false } }),
    );
    const center = GridSchema.safeParse(
      base({
        bounds: { position: [0, 0], width: 1, height: 1 },
        line: { spacing: 0.000001, origin: 0, includeBoundary: false },
      }),
    );

    expect(corner.success).toBe(false);
    expect(center.success).toBe(false);

    if (!corner.success) expect(corner.error.issues[0]?.path).toEqual(['line', 'spacing']);
    if (!center.success) expect(center.error.issues[0]?.path).toEqual(['line', 'spacing']);
  });

  it('报告独立方向路径上的有界晶格误差', () => {
    const result = GridSchema.safeParse(
      base({
        line: { vertical: { spacing: 0.000001, origin: 0, includeBoundary: false }, horizontal: { spacing: 10 } },
      }),
    );

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['line', 'vertical', 'spacing']);
  });
});
