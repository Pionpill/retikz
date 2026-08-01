import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { cellVisualScaleDefinitionOf, defineCellVisualScale, resolveCellVisualScaleRegistry } from '../../src';

const customScale = (name: string) =>
  defineCellVisualScale({
    name,
    optionsSchema: z.strictObject({ color: z.string().default('#123456') }),
    resolve: (options, values) => ({
      of: () => options.color,
      legendForm: 'swatch',
      domain: [...new Set(values)],
      range: [...new Set(values)].map(() => options.color),
    }),
  });

describe('Cell visual scale registry', () => {
  it('dispatches built-in and custom definitions through one registry', () => {
    const custom = customScale('company-color');
    const registry = resolveCellVisualScaleRegistry([custom]);

    expect(cellVisualScaleDefinitionOf('ordinal-color', registry).name).toBe('ordinal-color');
    expect(cellVisualScaleDefinitionOf('company-color', registry)).toBe(custom);
    expect(() => cellVisualScaleDefinitionOf('missing', registry)).toThrow(/not registered/i);
  });

  it('fails loud for empty, duplicate, and built-in-conflicting names', () => {
    expect(() => resolveCellVisualScaleRegistry([customScale('same'), customScale('same')])).toThrow(
      /duplicate.*same/i,
    );
    expect(() => resolveCellVisualScaleRegistry([customScale('ordinal-color')])).toThrow(/duplicate.*ordinal-color/i);
    expect(() => resolveCellVisualScaleRegistry([customScale('  ')])).toThrow(/non-empty/i);
  });
});
