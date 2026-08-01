import { describe, expect, it } from 'vitest';

import { BUILTIN_TABLE_STYLE_TOKENS } from '../../src';
import { resolveTableStyleTokens } from '../../src/providers/style';

describe('Table style token resolution', () => {
  it('defaults to neutral light and records all preset winners', () => {
    const resolved = resolveTableStyleTokens();

    expect(resolved.tokens).toEqual(BUILTIN_TABLE_STYLE_TOKENS.neutral.light);
    expect(Object.values(resolved.sources)).toEqual(Array.from({ length: 19 }, () => 'preset'));
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(Object.isFrozen(resolved.tokens)).toBe(true);
  });

  it('overlays independent leaves and atomically replaces structured tokens', () => {
    const categorical = ['pink'];
    const border = { kind: 'line' as const, stroke: 'purple', width: 3 };
    const resolved = resolveTableStyleTokens('neutral', 'light', {
      'columnHeader.content.color': '#123456',
      'table.border.horizontal': border,
      'data.categorical': categorical,
      'data.sequential': ['orange', 'purple'],
    });

    expect(resolved.tokens['cell.content.color']).toBe('#18181b');
    expect(resolved.tokens['columnHeader.content.color']).toBe('#123456');
    expect(resolved.tokens['table.border.horizontal']).toEqual(border);
    expect(resolved.tokens['data.categorical']).toEqual(['pink']);
    expect(resolved.tokens['data.sequential']).toEqual(['orange', 'purple']);
    expect(resolved.sources['columnHeader.content.color']).toBe('user');
    expect(resolved.sources['cell.content.color']).toBe('preset');

    categorical[0] = 'mutated';
    border.width = 9;
    expect(resolved.tokens['data.categorical']).toEqual(['pink']);
    expect(resolved.tokens['table.border.horizontal']).toEqual({ kind: 'line', stroke: 'purple', width: 3 });
  });
});
