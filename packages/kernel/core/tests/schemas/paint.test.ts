import { describe, expect, it } from 'vitest';

import { NodeSchema, PaintSchema, PathSchema, ScopeSchema } from '../../src/schemas';

describe('PaintSchema — linear gradient', () => {
  it('接受 2 stops + angle', () => {
    const spec = {
      kind: 'linearGradient' as const,
      angle: 90,
      stops: [
        { offset: 0, color: '#4f8' },
        { offset: 1, color: '#08f' },
      ],
    };
    expect(PaintSchema.parse(spec)).toEqual(spec);
  });

  it('angle 可省（缺省方向由 compile 定）', () => {
    expect(() =>
      PaintSchema.parse({
        kind: 'linearGradient',
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).not.toThrow();
  });

  it('stop 支持 opacity 与 currentColor', () => {
    expect(() =>
      PaintSchema.parse({
        kind: 'linearGradient',
        stops: [
          { offset: 0, color: 'currentColor', opacity: 0.5 },
          { offset: 1, color: 'currentColor', opacity: 1 },
        ],
      }),
    ).not.toThrow();
  });
});

describe('PaintSchema — radial gradient', () => {
  it('接受 2 stops（center / radius 可省）', () => {
    expect(() =>
      PaintSchema.parse({
        kind: 'radialGradient',
        stops: [
          { offset: 0, color: 'white' },
          { offset: 1, color: 'navy' },
        ],
      }),
    ).not.toThrow();
  });

  it('接受 center（objectBoundingBox 0..1）+ radius', () => {
    expect(() =>
      PaintSchema.parse({
        kind: 'radialGradient',
        center: [0.5, 0.5],
        radius: 0.75,
        stops: [
          { offset: 0, color: 'white' },
          { offset: 1, color: 'navy' },
        ],
      }),
    ).not.toThrow();
  });
});

describe('PaintSchema — 错误路径', () => {
  it('stops 少于 2 被拒', () => {
    expect(() => PaintSchema.parse({ kind: 'linearGradient', stops: [{ offset: 0, color: 'red' }] })).toThrow();
  });

  it('offset 越界被拒（< 0 / > 1）', () => {
    expect(() =>
      PaintSchema.parse({
        kind: 'linearGradient',
        stops: [
          { offset: -0.1, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).toThrow();
    expect(() =>
      PaintSchema.parse({
        kind: 'linearGradient',
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1.5, color: 'blue' },
        ],
      }),
    ).toThrow();
  });

  it('linear angle 非 finite 被拒', () => {
    expect(() =>
      PaintSchema.parse({
        kind: 'linearGradient',
        angle: Number.POSITIVE_INFINITY,
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).toThrow();
  });

  it('旧 type 判别字段被拒', () => {
    expect(() =>
      PaintSchema.parse({
        type: 'linearGradient',
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).toThrow();
  });

  it('未知 kind 被拒', () => {
    expect(() =>
      PaintSchema.parse({
        kind: 'meshGradient',
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).toThrow();
  });
});

describe('PaintSchema — pattern', () => {
  it('接受 lines / dots / grid（仅 shape 必填）', () => {
    for (const shape of ['lines', 'dots', 'grid'] as const) {
      expect(() => PaintSchema.parse({ kind: 'pattern', shape })).not.toThrow();
    }
  });

  it('接受并保留完整图案与线型字段', () => {
    const input = {
      kind: 'pattern' as const,
      shape: 'lines',
      color: 'currentColor',
      background: '#eee',
      size: 6,
      lineWidth: 1.5,
      dashed: true,
      dotted: true,
      dashPattern: [6, 3],
      dashOffset: -2,
      lineCap: 'round' as const,
      lineJoin: 'bevel' as const,
      rotation: 45,
    };
    const parsed = PaintSchema.parse(input);
    expect(parsed).toEqual(input);
    expect(PaintSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('保留横纵方向样式与稀疏线型周期，并通过 JSON 往返', () => {
    const input = {
      kind: 'pattern' as const,
      shape: 'grid',
      color: '#64748b',
      lineWidth: 1,
      dashed: true,
      horizontalStyle: {
        color: '#2563eb',
        dotted: true,
        lineCap: 'round' as const,
      },
      verticalStyle: {
        color: '#dc2626',
        dashPattern: [6, 2],
        lineWidth: 2,
      },
      lineStyleCycle: {
        period: 4,
        overrides: [
          { index: 0, style: { lineWidth: 3 } },
          { index: 3, style: { dashed: false, dotted: false } },
        ],
      },
    };

    const parsed = PaintSchema.parse(input);
    expect(parsed).toEqual(input);
    expect(PaintSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it.each([
    ['period 小于 2', { period: 1, overrides: [{ index: 0, style: {} }] }],
    ['period 大于 512', { period: 513, overrides: [{ index: 0, style: {} }] }],
    ['period 不是整数', { period: 2.5, overrides: [{ index: 0, style: {} }] }],
    ['period 不是 finite number', { period: Number.POSITIVE_INFINITY, overrides: [{ index: 0, style: {} }] }],
  ])('拒绝非法 lineStyleCycle：%s', (_label, lineStyleCycle) => {
    const result = PaintSchema.safeParse({ kind: 'pattern', shape: 'lines', lineStyleCycle });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path[0] === 'lineStyleCycle' && issue.path[1] === 'period')).toBe(
        true,
      );
    }
  });

  it('拒绝空 lineStyleCycle overrides', () => {
    const result = PaintSchema.safeParse({
      kind: 'pattern',
      shape: 'lines',
      lineStyleCycle: { period: 3, overrides: [] },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(issue => issue.path[0] === 'lineStyleCycle' && issue.path[1] === 'overrides'),
      ).toBe(true);
    }
  });

  it.each([
    ['负 index', { period: 3, overrides: [{ index: -1, style: {} }] }],
    ['越界 index', { period: 3, overrides: [{ index: 3, style: {} }] }],
    [
      '重复 index',
      {
        period: 3,
        overrides: [
          { index: 1, style: {} },
          { index: 1, style: { dashed: true } },
        ],
      },
    ],
  ])('拒绝非法 lineStyleCycle override：%s', (_label, lineStyleCycle) => {
    const result = PaintSchema.safeParse({ kind: 'pattern', shape: 'lines', lineStyleCycle });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          issue =>
            issue.path[0] === 'lineStyleCycle' &&
            issue.path[1] === 'overrides' &&
            typeof issue.path[2] === 'number' &&
            issue.path[3] === 'index',
        ),
      ).toBe(true);
    }
  });

  it.each([
    ['空 dashPattern', { dashPattern: [] }],
    ['负 dashPattern', { dashPattern: [2, -1] }],
    ['未知 lineCap', { lineCap: 'triangle' }],
    ['未知 lineJoin', { lineJoin: 'curve' }],
    ['非正 lineWidth', { lineWidth: 0 }],
    ['未知字段', { dashArray: [4, 2] }],
  ])('嵌套 Pattern line style 复用描边约束：%s', (_label, horizontalStyle) => {
    expect(
      PaintSchema.safeParse({
        kind: 'pattern',
        shape: 'grid',
        horizontalStyle,
      }).success,
    ).toBe(false);
  });

  it('shape 开放：接受任意非空 string（未注册名拒绝移到 compile 期）', () => {
    expect(() => PaintSchema.parse({ kind: 'pattern', shape: 'zigzag' })).not.toThrow();
    expect(() => PaintSchema.parse({ kind: 'pattern', shape: 'my-custom-motif' })).not.toThrow();
    // 内置 3 字面量仍合法
    for (const shape of ['lines', 'dots', 'grid'] as const) {
      expect(() => PaintSchema.parse({ kind: 'pattern', shape })).not.toThrow();
    }
  });

  it('空串 shape / size 非正 被拒', () => {
    expect(() => PaintSchema.parse({ kind: 'pattern', shape: '' })).toThrow();
    expect(() => PaintSchema.parse({ kind: 'pattern', shape: 'dots', size: 0 })).toThrow();
  });

  it('非法 dash pattern 被拒', () => {
    expect(() => PaintSchema.parse({ kind: 'pattern', shape: 'lines', dashPattern: [] })).toThrow();
    expect(() => PaintSchema.parse({ kind: 'pattern', shape: 'lines', dashPattern: [2, -1] })).toThrow();
  });

  it('未知 line cap / join 被拒', () => {
    expect(() => PaintSchema.parse({ kind: 'pattern', shape: 'lines', lineCap: 'triangle' })).toThrow();
    expect(() => PaintSchema.parse({ kind: 'pattern', shape: 'grid', lineJoin: 'curve' })).toThrow();
  });
});

describe('PaintSchema — image', () => {
  it('接受 href + 可选 fit', () => {
    expect(() => PaintSchema.parse({ kind: 'image', href: 'https://x/y.png' })).not.toThrow();
    for (const fit of ['fill', 'contain', 'cover'] as const) {
      expect(() => PaintSchema.parse({ kind: 'image', href: 'a.png', fit })).not.toThrow();
    }
  });

  it('空 href / 未知 fit 被拒', () => {
    expect(() => PaintSchema.parse({ kind: 'image', href: '' })).toThrow();
    expect(() => PaintSchema.parse({ kind: 'image', href: 'a.png', fit: 'tile' })).toThrow();
  });
});

describe('PaintSchema — JSON 可序列化', () => {
  it('parse 结果 round-trip JSON 不丢失', () => {
    const spec = {
      kind: 'radialGradient' as const,
      center: [0.5, 0.5] as [number, number],
      radius: 0.5,
      stops: [
        { offset: 0, color: 'white', opacity: 1 },
        { offset: 1, color: 'black', opacity: 0.8 },
      ],
    };
    const parsed = PaintSchema.parse(spec);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });
});

describe('stroke IRPaint schema', () => {
  const strokePaint = {
    kind: 'linearGradient',
    angle: 90,
    stops: [
      { offset: 0, color: '#2563eb' },
      { offset: 1, color: '#e11d48' },
    ],
  } as const;

  it('path-stroke-paint：PathSchema 接受 IRPaint stroke', () => {
    const parsed = PathSchema.parse({
      type: 'path',
      stroke: strokePaint,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    });
    expect(parsed.stroke).toEqual(strokePaint);
  });

  it('node-stroke-paint：NodeSchema 接受 IRPaint stroke', () => {
    const parsed = NodeSchema.parse({ type: 'node', position: [0, 0], stroke: strokePaint });
    expect(parsed.stroke).toEqual(strokePaint);
  });

  it('scope-stroke-paint：ScopeSchema 接受 IRPaint stroke 并保持 JSON round-trip', () => {
    const input = {
      type: 'scope',
      stroke: strokePaint,
      children: [{ type: 'node', position: [0, 0], text: 'A' }],
    };
    const parsed = ScopeSchema.parse(JSON.parse(JSON.stringify(input)));
    expect(parsed).toEqual(input);
  });

  it('invalid-stroke-paint：非法 IRPaint stroke 被 schema 拒绝', () => {
    expect(() =>
      PathSchema.parse({
        type: 'path',
        stroke: { kind: 'linearGradient', stops: [{ offset: 0, color: 'red' }] },
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      }),
    ).toThrow();
  });

  it('invalid-stroke-type：非字符串且非 IRPaint 的 stroke 被 schema 拒绝', () => {
    expect(() => NodeSchema.parse({ type: 'node', position: [0, 0], stroke: 123 })).toThrow();
  });
});
