import { describe, expect, it } from 'vitest';

import { normalizeShadow } from '../../src/normalize/shadow';
import { SHADOW_PRESETS } from '../../src/schemas';

describe('normalizeShadow', () => {
  it('expands preset strings and preset objects to the same canonical shadow', () => {
    expect(normalizeShadow('md')).toEqual(SHADOW_PRESETS.md);
    expect(normalizeShadow({ preset: 'md' })).toEqual(SHADOW_PRESETS.md);
  });

  it('applies explicit fields after the preset while preserving falsy values', () => {
    expect(normalizeShadow({ preset: 'sm', offsetY: 0, blur: 0, opacity: 0 })).toEqual({
      offsetX: SHADOW_PRESETS.sm!.offsetX,
      offsetY: 0,
      blur: 0,
      color: SHADOW_PRESETS.sm!.color,
      opacity: 0,
    });
  });

  it('supplies the default color for explicit offsets and keeps omitted or none absent', () => {
    expect(normalizeShadow({ offsetX: 0, offsetY: 0 })).toEqual({
      offsetX: 0,
      offsetY: 0,
      color: 'rgba(0,0,0,0.5)',
    });
    expect(normalizeShadow(undefined)).toBeUndefined();
    expect(normalizeShadow('none')).toBeUndefined();
  });
});
