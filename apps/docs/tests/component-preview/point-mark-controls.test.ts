import { describe, expect, it } from 'vitest';

import type { PreviewControlContract } from '@/modules/docs/preview';

import {
  getPreviewControlFields,
  resolveVisiblePreviewControlSections,
} from '@/modules/docs/components/component-preview/controls';
import { previewControlContract as cartesianJitterContract } from '@/modules/docs/contents/viz/plot/mark/point/point-jitter-cartesian.controls';
import { previewControlContract as cartesianJitterEnglishContract } from '@/modules/docs/contents/viz/plot/mark/point/point-jitter-cartesian.en.controls';
import { previewControlContract as polarJitterContract } from '@/modules/docs/contents/viz/plot/mark/point/point-jitter-polar.controls';
import { previewControlContract as polarJitterEnglishContract } from '@/modules/docs/contents/viz/plot/mark/point/point-jitter-polar.en.controls';
import {
  pointNodeShapeOf,
  previewControlContract as nodeShapeContract,
} from '@/modules/docs/contents/viz/plot/mark/point/point-node-shape.controls';
import { previewControlContract as nodeShapeEnglishContract } from '@/modules/docs/contents/viz/plot/mark/point/point-node-shape.en.controls';
import { previewControlContract as positionContract } from '@/modules/docs/contents/viz/plot/mark/point/point-position.controls';
import { previewControlContract as positionEnglishContract } from '@/modules/docs/contents/viz/plot/mark/point/point-position.en.controls';
import { previewControlContract as styleContract } from '@/modules/docs/contents/viz/plot/mark/point/point-style.controls';
import { previewControlContract as styleEnglishContract } from '@/modules/docs/contents/viz/plot/mark/point/point-style.en.controls';
import { previewControlContract as textContract } from '@/modules/docs/contents/viz/plot/mark/point/point-text.controls';
import { previewControlContract as textEnglishContract } from '@/modules/docs/contents/viz/plot/mark/point/point-text.en.controls';

const controlIdsOf = (contract: PreviewControlContract): Array<string> =>
  getPreviewControlFields(contract.controls).map(field => field.id);

const contractShapeOf = (contract: PreviewControlContract) =>
  getPreviewControlFields(contract.controls).map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    visibleWhen: field.visibleWhen,
    min: 'min' in field ? field.min : undefined,
    max: 'max' in field ? field.max : undefined,
    step: 'step' in field ? field.step : undefined,
    optionValues: 'options' in field ? field.options.map(option => option.value) : undefined,
  }));

const presetShapeOf = (contract: PreviewControlContract) =>
  contract.presets?.map(preset => ({ id: preset.id, values: preset.values }));

describe('PointMark controls 渐进试验场', () => {
  it('六个 playground 的数据区默认收起', () => {
    for (const contract of [
      positionContract,
      cartesianJitterContract,
      polarJitterContract,
      styleContract,
      textContract,
      nodeShapeContract,
    ]) {
      expect(contract.controls.sections[0].defaultCollapsed).toBe(true);
    }
  });

  it('六个 playground 分别暴露足以形成明显差异的公开能力', () => {
    expect(controlIdsOf(positionContract)).toEqual([
      'point-position-coordinate',
      'point-position-x-field',
      'point-position-y-field',
      'point-position-color-mode',
      'point-position-size-mode',
    ]);
    expect(controlIdsOf(styleContract)).toEqual([
      'point-style-coordinate',
      'point-paint-mode',
      'point-fill',
      'point-stroke',
      'point-stroke-width',
      'point-fill-opacity',
      'point-stroke-opacity',
      'point-opacity',
      'point-size',
      'point-dashed',
      'point-shadow',
    ]);
    expect(controlIdsOf(cartesianJitterContract)).toEqual([
      'point-jitter-cartesian-span-kind',
      'point-jitter-cartesian-ratio',
      'point-jitter-cartesian-range',
      'point-jitter-cartesian-seed',
    ]);
    expect(controlIdsOf(polarJitterContract)).toEqual([
      'point-jitter-polar-scale',
      'point-jitter-polar-ratio',
      'point-jitter-polar-range',
      'point-jitter-polar-seed',
    ]);
    expect(controlIdsOf(textContract)).toEqual([
      'point-text-coordinate',
      'point-text-mode',
      'point-text-color',
      'point-font-size',
      'point-font-bold',
      'point-label-position',
      'point-label-distance',
      'point-label-pin',
      'point-text-dx',
      'point-text-dy',
    ]);
    expect(controlIdsOf(nodeShapeContract)).toEqual([
      'point-node-coordinate',
      'point-node-shape',
      'point-node-size',
      'point-node-rotate',
      'point-node-star-points',
      'point-node-polygon-sides',
    ]);
  });

  it('双语 controls 共享相同结构与 canonical 状态', () => {
    for (const [chinese, english] of [
      [positionContract, positionEnglishContract],
      [cartesianJitterContract, cartesianJitterEnglishContract],
      [polarJitterContract, polarJitterEnglishContract],
      [styleContract, styleEnglishContract],
      [textContract, textEnglishContract],
      [nodeShapeContract, nodeShapeEnglishContract],
    ] as const) {
      expect(contractShapeOf(english)).toEqual(contractShapeOf(chinese));
      expect(english.canonicalValues).toEqual(chinese.canonicalValues);
      expect(presetShapeOf(english)).toEqual(presetShapeOf(chinese));
      expect(english.relatedApis).toEqual(chinese.relatedApis);
    }
  });

  it('直角坐标只显示当前宽度单位对应的 span 控件', () => {
    const visibleIds = (spanKind: string) =>
      resolveVisiblePreviewControlSections(cartesianJitterContract.controls.sections, {
        'point-jitter-cartesian-span-kind': spanKind,
      }).flatMap(section => section.controls.map(control => control.id));

    expect(visibleIds('ratio')).toContain('point-jitter-cartesian-ratio');
    expect(visibleIds('ratio')).not.toContain('point-jitter-cartesian-range');
    expect(visibleIds('range')).toContain('point-jitter-cartesian-range');
    expect(visibleIds('range')).not.toContain('point-jitter-cartesian-ratio');
  });

  it('极坐标只显示当前角度类型对应的散布宽度控件', () => {
    const visibleIds = (scale: string) =>
      resolveVisiblePreviewControlSections(polarJitterContract.controls.sections, {
        'point-jitter-polar-scale': scale,
      }).flatMap(section => section.controls.map(control => control.id));

    expect(visibleIds('discrete')).toContain('point-jitter-polar-ratio');
    expect(visibleIds('discrete')).not.toContain('point-jitter-polar-range');
    expect(visibleIds('continuous')).toContain('point-jitter-polar-range');
    expect(visibleIds('continuous')).not.toContain('point-jitter-polar-ratio');
    expect(visibleIds('discrete')).toContain('point-jitter-polar-seed');
    expect(visibleIds('continuous')).toContain('point-jitter-polar-seed');
  });

  it('Node 参数只在对应形状下显示，并生成真实参数化边界', () => {
    const definition = nodeShapeContract.controls;

    const visibleIds = (shape: string) =>
      resolveVisiblePreviewControlSections(definition.sections, { 'point-node-shape': shape }).flatMap(section =>
        section.controls.map(control => control.id),
      );

    expect(visibleIds('circle')).not.toContain('point-node-star-points');
    expect(visibleIds('circle')).not.toContain('point-node-polygon-sides');
    expect(visibleIds('star')).toContain('point-node-star-points');
    expect(visibleIds('polygon')).toContain('point-node-polygon-sides');

    expect(pointNodeShapeOf({ shape: 'star', size: 30, starPoints: 7, polygonSides: 6 })).toEqual({
      type: 'star',
      params: { points: 7, innerRadius: 7, outerRadius: 15 },
    });
    expect(pointNodeShapeOf({ shape: 'star', size: 18, starPoints: 5, polygonSides: 6 })).toEqual({
      type: 'star',
      params: { points: 5, innerRadius: 4.2, outerRadius: 9 },
    });
    expect(pointNodeShapeOf({ shape: 'polygon', size: 18, starPoints: 5, polygonSides: 8 })).toEqual({
      type: 'polygon',
      params: { sides: 8 },
    });
  });
});
