import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import * as RibbonExports from '../../src/ribbon';
import {
  RibbonPathSchema,
  RibbonPathOptionsSchema,
  RibbonWidthSchema,
  BuiltinRibbonWidthProfile,
  RibbonWidthProfileNameSchema,
} from '../../src/ribbon';

describe('扩展功能区 schema', () => {
  it('将功能区选项存储在完整的 Path 主题上的 kindOptions 下', () => {
    const result = RibbonPathSchema.safeParse({
      type: 'path',
      kind: 'ribbon',
      kindOptions: { width: { kind: 'fixed', value: 10 } },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('仅导出规范的功能区选项 schema 名称', () => {
    expect(RibbonExports).toHaveProperty('RibbonPathOptionsSchema');
    expect(RibbonExports).not.toHaveProperty('PathRibbonOptionsSchema');
  });

  it('提示内置宽度配置，同时保留自定义提供者名称', () => {
    expect(toJSONSchema(RibbonWidthProfileNameSchema)).toMatchObject({
      anyOf: [
        { type: 'string', enum: Object.values(BuiltinRibbonWidthProfile) },
        { type: 'string', minLength: 1 },
      ],
    });
    expect(RibbonWidthProfileNameSchema.parse(BuiltinRibbonWidthProfile.Bulge)).toBe(BuiltinRibbonWidthProfile.Bulge);
    expect(RibbonWidthProfileNameSchema.parse('custom.profile')).toBe('custom.profile');
    expect(() => RibbonWidthProfileNameSchema.parse('   ')).toThrow();
  });
});

describe('色带识别宽度输入', () => {
  it.each([
    { kind: 'fixed', value: 12 },
    { kind: 'taper', start: 12, end: 24 },
    {
      kind: 'stops',
      stops: [
        { offset: 0, value: 12 },
        { offset: 1, value: 24 },
      ],
    },
    { kind: 'profile', name: 'bulge', params: { base: 12, peak: 24 } },
  ])('接受 $kind 并通过 JSON 保留其判别字段', width => {
    const result = RibbonWidthSchema.parse(JSON.parse(JSON.stringify(width)));

    expect(result.kind).toBe(width.kind);

    if (result.kind === 'taper' || result.kind === 'stops') expect(result.interpolation).toBe('linear');
  });

  it.each([
    12,
    {},
    { kind: 'fixed' },
    { kind: 'taper', start: 12 },
    { kind: 'fixed', value: 12, end: 24 },
    { kind: 'profile', name: 'bulge', interpolation: 'linear' },
  ])('拒绝丢失或混合宽度分支：%j', width => {
    expect(RibbonWidthSchema.safeParse(width).success).toBe(false);
  });

  it('具体化中心线默认值并拒绝删除的端点宽度字段', () => {
    const width = { kind: 'fixed', value: 12 };

    expect(RibbonPathOptionsSchema.parse({ width })).toMatchObject({
      mode: 'centerline',
      align: 'center',
      sampling: { kind: 'fixed', samples: 64 },
    });
    expect(RibbonPathOptionsSchema.safeParse({ width, start: { width: 8 } }).success).toBe(false);
    expect(RibbonPathOptionsSchema.safeParse({ width, interpolation: 'smooth' }).success).toBe(false);
    expect(RibbonPathOptionsSchema.safeParse({}).success).toBe(false);
  });

  it('实现自动方向并通过 JSON 保留显式方向', () => {
    const width = { kind: 'fixed', value: 12 };

    expect(RibbonPathOptionsSchema.parse({ width })).toMatchObject({
      start: { direction: 'auto', cap: { name: 'butt' } },
      end: { direction: 'auto', cap: { name: 'butt' } },
    });

    for (const direction of [90, [0, 1], { angle: 90, radius: 1 }]) {
      const input = { width, start: { direction }, end: { direction } };

      expect(RibbonPathOptionsSchema.parse(JSON.parse(JSON.stringify(input)))).toMatchObject(input);
    }

    expect(RibbonPathOptionsSchema.safeParse({ width, start: { direction: [0, 0] } }).success).toBe(false);
  });

  it('在边界模式下需要边界路径并拒绝仅中心线场', () => {
    const upper = [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
    ];
    const lower = [
      { type: 'step', kind: 'move', to: [0, 5] },
      { type: 'step', kind: 'line', to: [10, 5] },
    ];

    expect(RibbonPathOptionsSchema.safeParse({ mode: 'boundary', upper, lower }).success).toBe(true);
    expect(RibbonPathOptionsSchema.safeParse({ mode: 'boundary', upper }).success).toBe(false);
    expect(
      RibbonPathOptionsSchema.safeParse({ mode: 'boundary', upper, lower, width: { kind: 'fixed', value: 12 } })
        .success,
    ).toBe(false);
  });
});

describe('功能区源主题分支', () => {
  it('需要中心线子代，禁止边界子代', () => {
    const children = [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
    ];
    const base = { type: 'path', kind: 'ribbon' };

    expect(RibbonPathSchema.safeParse({ ...base, kindOptions: { width: { kind: 'fixed', value: 4 } } }).success).toBe(
      false,
    );
    expect(
      RibbonPathSchema.safeParse({ ...base, kindOptions: { mode: 'boundary', upper: children, lower: children } })
        .success,
    ).toBe(true);
    expect(
      RibbonPathSchema.safeParse({
        ...base,
        kindOptions: { mode: 'boundary', upper: children, lower: children },
        children,
      }).success,
    ).toBe(false);
  });

  it('用自己的判别字段和必需字段投影每个宽度分支', () => {
    const projected = toJSONSchema(RibbonWidthSchema, { io: 'input' });

    expect(projected).toMatchObject({
      oneOf: [
        { properties: { kind: { const: 'fixed' } }, required: ['kind', 'value'], additionalProperties: false },
        {
          properties: { kind: { const: 'taper' } },
          required: ['kind', 'start', 'end'],
          additionalProperties: false,
        },
        {
          properties: { kind: { const: 'stops' } },
          required: ['kind', 'stops'],
          additionalProperties: false,
        },
        { properties: { kind: { const: 'profile' } }, required: ['kind', 'name'], additionalProperties: false },
      ],
    });
  });
});
