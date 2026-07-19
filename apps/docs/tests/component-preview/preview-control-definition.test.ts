import { describe, expect, expectTypeOf, it } from 'vitest';

import type { PreviewControlValuesFor } from '../../src/modules/docs/components/component-preview';

import { definePreviewControls } from '../../src/modules/docs/components/component-preview';
import {
  buildPreviewControlDefaults,
  getPreviewControlFields,
  resolveVisiblePreviewControlSections,
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
        {
          kind: 'point',
          id: 'controlPoint',
          label: 'Control point',
          defaultValue: [100, -70],
          min: [-50, -100],
          max: [250, 100],
          step: 5,
        },
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
      controlPoint: [number, number];
    }>();
  });

  it('扁平化 section 并生成唯一默认值', () => {
    expect(getPreviewControlFields(panelDefinition)).toHaveLength(7);
    expect(buildPreviewControlDefaults(panelDefinition)).toEqual({
      text: 'Node',
      strokeWidth: 2,
      shape: 'rectangle',
      dashed: false,
      fill: '#ffffff',
      opacity: 1,
      controlPoint: [100, -70],
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

  it('拒绝引用未知字段的可见条件', () => {
    expect(() =>
      definePreviewControls({
        presentation: 'panel',
        sections: [
          {
            controls: [
              {
                kind: 'text',
                id: 'label',
                label: 'Label',
                defaultValue: 'Node',
                visibleWhen: { controlId: 'missing', oneOf: ['show'] },
              },
            ],
          },
        ],
      }),
    ).toThrow('Preview control condition references unknown control id: "missing".');
  });

  it('拒绝空的可见条件值集合', () => {
    expect(() =>
      definePreviewControls({
        presentation: 'panel',
        sections: [
          {
            controls: [
              {
                kind: 'select',
                id: 'kind',
                label: 'Kind',
                defaultValue: 'show',
                options: [{ value: 'show', label: 'Show' }],
              },
            ],
          },
          {
            visibleWhen: { controlId: 'kind', oneOf: [] },
            controls: [{ kind: 'text', id: 'label', label: 'Label', defaultValue: 'Node' }],
          },
        ],
      }),
    ).toThrow('Preview control condition for "kind" must define at least one value.');
  });

  it('按当前值过滤字段与分组，但保留全部默认值', () => {
    const definition = definePreviewControls({
      presentation: 'panel',
      sections: [
        {
          label: 'Kind',
          controls: [
            {
              kind: 'select',
              id: 'kind',
              label: 'Kind',
              defaultValue: 'a',
              options: [
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
              ],
            },
          ],
        },
        {
          label: 'A',
          visibleWhen: { controlId: 'kind', oneOf: ['a'] },
          controls: [{ kind: 'number', id: 'aValue', label: 'A', defaultValue: 1 }],
        },
        {
          label: 'Conditional fields',
          controls: [
            {
              kind: 'number',
              id: 'bValue',
              label: 'B',
              defaultValue: 2,
              visibleWhen: { controlId: 'kind', oneOf: ['b'] },
            },
          ],
        },
      ],
    });

    expect(
      resolveVisiblePreviewControlSections(definition.sections, { kind: 'a' }).map(section => section.label),
    ).toEqual(['Kind', 'A']);
    expect(
      resolveVisiblePreviewControlSections(definition.sections, { kind: 'b' }).map(section => ({
        label: section.label,
        ids: section.controls.map(field => field.id),
      })),
    ).toEqual([
      { label: 'Kind', ids: ['kind'] },
      { label: 'Conditional fields', ids: ['bValue'] },
    ]);
    expect(buildPreviewControlDefaults(definition)).toEqual({ kind: 'a', aValue: 1, bValue: 2 });
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

  it('拒绝无效或越界的 point 坐标', () => {
    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [
          {
            kind: 'point',
            id: 'control',
            label: 'Control',
            defaultValue: [0] as unknown as [number, number],
            min: [-100, -100],
            max: [100, 100],
          },
        ],
      }),
    ).toThrow('Preview point control "control" defaultValue must be a two-number tuple.');

    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [
          {
            kind: 'point',
            id: 'control',
            label: 'Control',
            defaultValue: [Number.NaN, 0],
            min: [-100, -100],
            max: [100, 100],
          },
        ],
      }),
    ).toThrow('Preview point control "control" defaultValue[0] must be finite.');

    expect(() =>
      definePreviewControls({
        presentation: 'overlay',
        controls: [
          {
            kind: 'point',
            id: 'control',
            label: 'Control',
            defaultValue: [120, 0],
            min: [-100, -100],
            max: [100, 100],
          },
        ],
      }),
    ).toThrow('Preview point control "control" defaultValue[0] must be between -100 and 100.');
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
