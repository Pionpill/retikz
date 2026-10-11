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

describe('Extension Ribbon schema', () => {
  it('stores ribbon options under kindOptions on a complete Path subject', () => {
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

  it('exports only the canonical Ribbon options schema name', () => {
    expect(RibbonExports).toHaveProperty('RibbonPathOptionsSchema');
    expect(RibbonExports).not.toHaveProperty('PathRibbonOptionsSchema');
  });

  it('hints the built-in width profile while preserving custom provider names', () => {
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

describe('Ribbon discriminated width inputs', () => {
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
  ])('accepts $kind and retains its discriminator through JSON', width => {
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
  ])('rejects missing or mixed width branches: %j', width => {
    expect(RibbonWidthSchema.safeParse(width).success).toBe(false);
  });

  it('materializes centerline defaults and rejects removed endpoint width fields', () => {
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

  it('materializes automatic direction and retains explicit directions through JSON', () => {
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

  it('requires boundary paths and rejects centerline-only fields in boundary mode', () => {
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

describe('Ribbon source subject branches', () => {
  it('requires centerline children and forbids boundary children', () => {
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

  it('projects each width branch with its own discriminator and required fields', () => {
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
