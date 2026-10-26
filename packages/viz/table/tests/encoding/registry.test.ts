import { describe, expect, it } from 'vitest';
import { strictObject, string } from 'zod';

import { cellVisualScaleDefinitionOf, defineCellVisualScale, resolveCellVisualScaleRegistry } from '../../src';

const customScale = (name: string) =>
  defineCellVisualScale({
    name,
    optionsSchema: strictObject({ color: string().default('#123456') }),
    resolve: (options, values) => ({
      of: () => options.color,
      legendForm: 'swatch',
      domain: [...new Set(values)],
      range: [...new Set(values)].map(() => options.color),
    }),
  });

describe('Cell 视觉比例注册表', () => {
  it('通过一个注册表调度内置和自定义定义', () => {
    const custom = customScale('company-color');
    const registry = resolveCellVisualScaleRegistry([custom]);

    expect(cellVisualScaleDefinitionOf('ordinal-color', registry).name).toBe('ordinal-color');
    expect(cellVisualScaleDefinitionOf('company-color', registry)).toBe(custom);
    expect(() => cellVisualScaleDefinitionOf('missing', registry)).toThrow(/not registered/i);
  });

  it('重复和内置冲突名称时会失败', () => {
    expect(() => resolveCellVisualScaleRegistry([customScale('same'), customScale('same')])).toThrow(
      /duplicate.*same/i,
    );
    expect(() => resolveCellVisualScaleRegistry([customScale('ordinal-color')])).toThrow(/duplicate.*ordinal-color/i);
  });
});
