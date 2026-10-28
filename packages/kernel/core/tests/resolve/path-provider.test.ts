import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import { definePath, PathSchema, resolveArrowRegistry, resolvePathRegistry } from '../../src';
import type { IRPathBase } from '../../src/schemas';
import { resolvePathWithBuiltinProviders, resolveStrokePathWithBuiltinProviders } from './path-helper';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
];

const path = (overrides: Partial<IRPathBase> = {}): IRPathBase => ({
  type: 'path',
  children: steps,
  ...overrides,
});

describe('解析/路径提供者绑定', () => {
  it('绑定内置和自定义路径定义并解析一次选项', () => {
    const custom = definePath({
      name: 'highlight',
      schema: PathSchema.extend({
        kind: literal('highlight'),
        kindOptions: strictObject({ stroke: string() }),
      }),
      compile: () => null,
    });
    const resolution = resolvePathWithBuiltinProviders(path({ kind: 'highlight', kindOptions: { stroke: 'gold' } }), {
      pathRegistry: resolvePathRegistry([custom]),
    });

    expect(resolution.kind.name).toBe('highlight');
    expect(resolution.kind.definition).toBe(custom);
    expect(resolution.kind.path.kindOptions).toEqual({ stroke: 'gold' });
    expect(resolvePathWithBuiltinProviders(path()).kind.name).toBe('stroke');
  });

  it('在自定义严格路径定义 schema 解析标签之前报告不支持的显式中断', () => {
    const strictRibbon = definePath({
      name: 'ribbon',
      schema: PathSchema.extend({
        kind: literal('ribbon'),
        label: strictObject({ text: string() }).optional(),
      }),
      compile: () => null,
    });

    expect(() =>
      resolvePathWithBuiltinProviders(path({ kind: 'ribbon', label: { text: 'unsupported', interrupt: false } }), {
        pathRegistry: resolvePathRegistry([strictRibbon]),
      }),
    ).toThrow(/label\.interrupt.*built-in stroke path/i);
  });

  it('报告宿主阵列和步骤标签定位器处已填充的行程中断请求', () => {
    expect(() =>
      resolvePathWithBuiltinProviders(
        path({
          label: [{ text: 'host', interrupt: true }],
          style: { fill: 'gold' },
        }),
      ),
    ).toThrow(/label\[0\]\.interrupt.*filled stroke path/i);

    expect(() =>
      resolvePathWithBuiltinProviders(
        path({
          children: [steps[0], { type: 'step', kind: 'line', to: [10, 0], label: { text: 'step', interrupt: true } }],
          style: { fill: 'gold' },
        }),
      ),
    ).toThrow(/children\[1\]\.label\.interrupt.*filled stroke path/i);

    expect(
      resolvePathWithBuiltinProviders(
        path({
          label: { text: 'continuous', interrupt: false },
          style: { fill: 'gold' },
        }),
      ).path.label,
    ).toMatchObject([{ text: 'continuous', interrupt: false }]);
  });

  it('通过解析器注册表诊断未知路径定义失败', () => {
    expect(() => resolvePathWithBuiltinProviders(path({ kind: 'missing' }), { pathRegistry: resolvePathRegistry() })).toThrow(
      /Unknown provider 'missing'.*available: stroke/s,
    );
  });

  it('从解析器报告未知的箭头名称', () => {
    expect(() =>
      resolveStrokePathWithBuiltinProviders(path({ arrow: { end: { shape: 'missing-arrow' } } }), {
        irPath: 'children[0].path',
      }),
    ).toThrow(/Unknown provider 'missing-arrow'.*available:/s);
  });

  it('在标记发出之前绑定箭头空心视觉默认值和几何形状', () => {
    const arrow = {
      name: 'hollowProbe',
      hollow: true,
      backX: 1,
      lineContactX: 2,
      emit: () => [],
    };
    const mark = { shape: 'hollowProbe', length: 12, scale: 2 };
    const resolution = resolveStrokePathWithBuiltinProviders(path({ arrow: { end: mark } }), {
      arrowRegistry: resolveArrowRegistry([arrow]),
    });
    const resolvedMark = resolution.path.arrow?.end;
    if (resolvedMark === undefined) throw new Error('Expected endpoint arrow');
    const arrowResolution = resolution.arrows.get(resolvedMark);

    expect(arrowResolution?.definition).toBe(arrow);
    expect(arrowResolution?.visual.fill).toBeUndefined();
    expect(arrowResolution?.visual).toMatchObject({ length: 12, scale: 2, width: 8 });
    expect(arrowResolution?.geometry.contactX).toBe(2 - 1.5 / 2);
    expect(arrowResolution?.geometry).toHaveProperty('visualBackX', 1 - 1.5 / 2);
    expect(arrowResolution?.geometry.resolvedLength).toBe(24);
    expect(arrowResolution?.geometry.shrink).toBeGreaterThan(0);
  });

  it.each([
    {
      name: 'non-finite back',
      definition: { backX: Number.NaN, lineContactX: 2, tipX: 8 },
      expected: /non-finite backX/i,
    },
    {
      name: 'back after contact',
      definition: { backX: 3, lineContactX: 2, tipX: 8 },
      expected: /backX.*lineContactX.*tipX/i,
    },
    {
      name: 'contact after tip',
      definition: { backX: 1, lineContactX: 9, tipX: 8 },
      expected: /backX.*lineContactX.*tipX/i,
    },
  ])('拒绝无效的箭头几何形状：$name', ({ definition, expected }) => {
    const arrow = {
      name: 'invalidGeometry',
      ...definition,
      emit: () => [],
    };

    expect(() =>
      resolveStrokePathWithBuiltinProviders(path({ arrow: { end: { shape: 'invalidGeometry' } } }), {
        arrowRegistry: resolveArrowRegistry([arrow]),
      }),
    ).toThrow(expected);
  });

  it('在编译消费前拒绝解析后非有限的 visual back 值', () => {
    const arrow = {
      name: 'overflowBack',
      backX: -Number.MAX_VALUE,
      lineContactX: 0,
      tipX: 1,
      outerInset: Number.MAX_VALUE,
      defaultLength: 0.1,
      emit: () => [],
    };

    expect(() =>
      resolveStrokePathWithBuiltinProviders(path({ arrow: { end: { shape: arrow.name, endpointOverlap: 0 } } }), {
        arrowRegistry: resolveArrowRegistry([arrow]),
      }),
    ).toThrow(/resolved visual back.*non-finite/i);
  });
});
