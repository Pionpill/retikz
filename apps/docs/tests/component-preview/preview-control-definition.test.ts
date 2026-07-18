import { describe, expect, expectTypeOf, it } from 'vitest';

import type { PreviewControlValuesFor } from '../../src/modules/docs/components/component-preview';

import { definePreviewControls } from '../../src/modules/docs/components/component-preview';
import {
  buildPreviewControlDefaults,
  getPreviewControlFields,
} from '../../src/modules/docs/components/component-preview/controls';

const panelDefinition = definePreviewControls({
  presentation: 'panel',
  title: 'Node',
  sections: [
    {
      label: 'Appearance',
      controls: [
        { kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' },
        { kind: 'number', id: 'strokeWidth', label: 'Stroke width', defaultValue: 2, min: 0, step: 0.5 },
        {
          kind: 'select',
          id: 'shape',
          label: 'Shape',
          defaultValue: 'rectangle',
          options: [
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' },
          ],
        },
        { kind: 'switch', id: 'dashed', label: 'Dashed', defaultValue: false },
        { kind: 'color', id: 'fill', label: 'Fill', defaultValue: '#ffffff' },
        { kind: 'range', id: 'opacity', label: 'Opacity', defaultValue: 1, min: 0, max: 1, step: 0.1 },
      ],
    },
  ],
});

describe('preview controls definition', () => {
  it('从 kind 与 id 推导值对象', () => {
    expectTypeOf<PreviewControlValuesFor<typeof panelDefinition>>().toEqualTypeOf<{
      text: string;
      strokeWidth: number;
      shape: 'rectangle' | 'circle';
      dashed: boolean;
      fill: string;
      opacity: number;
    }>();
  });

  it('扁平化 section 并生成唯一默认值', () => {
    expect(getPreviewControlFields(panelDefinition)).toHaveLength(6);
    expect(buildPreviewControlDefaults(panelDefinition)).toEqual({
      text: 'Node',
      strokeWidth: 2,
      shape: 'rectangle',
      dashed: false,
      fill: '#ffffff',
      opacity: 1,
    });
  });

  it('拒绝重复字段 id', () => {
    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [
          { kind: 'text', id: 'same', label: 'A', defaultValue: 'a' },
          { kind: 'text', id: 'same', label: 'B', defaultValue: 'b' },
        ],
      }),
    ).toThrow('Duplicate preview control id: "same".');
  });

  it('拒绝空 select 与重复 option value', () => {
    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [{ kind: 'select', id: 'shape', label: 'Shape', defaultValue: 'circle', options: [] }],
      }),
    ).toThrow('Preview select control "shape" must define at least one option.');

    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [
          {
            kind: 'select',
            id: 'shape',
            label: 'Shape',
            defaultValue: 'circle',
            options: [
              { value: 'circle', label: 'Circle' },
              { value: 'circle', label: 'Round' },
            ],
          },
        ],
      }),
    ).toThrow('Duplicate preview select option value "circle" in control "shape".');
  });

  it('拒绝不在选项中的 select 默认值', () => {
    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [
          {
            kind: 'select',
            id: 'shape',
            label: 'Shape',
            defaultValue: 'diamond',
            options: [{ value: 'circle', label: 'Circle' }],
          },
        ],
      }),
    ).toThrow('Preview select control "shape" defaultValue "diamond" is not present in options.');
  });

  it('拒绝非有限 number 配置与倒置边界', () => {
    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [{ kind: 'number', id: 'size', label: 'Size', defaultValue: Number.NaN }],
      }),
    ).toThrow('Preview number control "size" defaultValue must be finite.');

    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [{ kind: 'number', id: 'size', label: 'Size', defaultValue: 2, min: 3, max: 1 }],
      }),
    ).toThrow('Preview number control "size" min must not exceed max.');
  });

  it('拒绝越界的 number 与 range 默认值', () => {
    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [{ kind: 'number', id: 'size', label: 'Size', defaultValue: 4, min: 0, max: 3 }],
      }),
    ).toThrow('Preview number control "size" defaultValue must be between 0 and 3.');

    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [{ kind: 'range', id: 'opacity', label: 'Opacity', defaultValue: 2, min: 0, max: 1 }],
      }),
    ).toThrow('Preview range control "opacity" defaultValue must be between 0 and 1.');
  });

  it('拒绝无效颜色默认值', () => {
    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [{ kind: 'color', id: 'fill', label: 'Fill', defaultValue: 'red' }],
      }),
    ).toThrow('Preview color control "fill" defaultValue must be a #RRGGBB hex color.');
  });
});
