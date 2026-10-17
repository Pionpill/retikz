import { describe, expect, it } from 'vitest';

import {
  getPreviewControlFields,
  resolveVisiblePreviewControlSections,
} from '@/modules/docs/components/component-preview/controls';
import { previewControlContract as cartesianJitterContract } from '@/modules/docs/contents/viz/plot/mark/point/point-jitter.controls';
import { createPreviewControlContract as cartesianJitterEnglishContractFactory } from '@/modules/docs/contents/viz/plot/mark/point/point-jitter.controls';
import {
  pointNodeShapeOf,
  previewControlContract as nodeShapeContract,
} from '@/modules/docs/contents/viz/plot/mark/point/point-node-shape.controls';
import { createPreviewControlContract as nodeShapeEnglishContractFactory } from '@/modules/docs/contents/viz/plot/mark/point/point-node-shape.controls';
import { previewControlContract as positionContract } from '@/modules/docs/contents/viz/plot/mark/point/point-position.controls';
import { createPreviewControlContract as positionEnglishContractFactory } from '@/modules/docs/contents/viz/plot/mark/point/point-position.controls';
import { previewControlContract as styleContract } from '@/modules/docs/contents/viz/plot/mark/point/point-style.controls';
import { createPreviewControlContract as styleEnglishContractFactory } from '@/modules/docs/contents/viz/plot/mark/point/point-style.controls';
import { previewControlContract as textContract } from '@/modules/docs/contents/viz/plot/mark/point/point-text.controls';
import { createPreviewControlContract as textEnglishContractFactory } from '@/modules/docs/contents/viz/plot/mark/point/point-text.controls';
import type { PreviewControlContract } from '@/modules/docs/preview';

const cartesianJitterEnglishContract = cartesianJitterEnglishContractFactory('en');
const nodeShapeEnglishContract = nodeShapeEnglishContractFactory('en');
const positionEnglishContract = positionEnglishContractFactory('en');
const styleEnglishContract = styleEnglishContractFactory('en');
const textEnglishContract = textEnglishContractFactory('en');

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
  it('五个 playground 的数据区默认收起', () => {
    for (const contract of [
      positionContract,
      cartesianJitterContract,
      styleContract,
      textContract,
      nodeShapeContract,
    ]) {
      expect(contract.controls.sections[0].defaultCollapsed).toBe(true);
    }
  });

  it('五个 playground 分别暴露足以形成明显差异的公开能力', () => {
    expect(controlIdsOf(positionContract)).toEqual([
      'point-position-minimumSize',

      'point-position-coordinate',
      'point-position-x-field',
      'point-position-y-field',
      'point-position-color-mode',
      'point-position-size-mode',
    ]);
    expect(controlIdsOf(styleContract)).toEqual([
      'point-style-dotted',
      'point-style-dashPattern',
      'point-style-blendMode',
      'point-style-zIndex',

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
      'point-jitter-coordinate',
      'point-jitter-span-kind',
      'point-jitter-ratio',
      'point-jitter-range',
      'point-jitter-distribution',
      'point-jitter-sigma',
      'point-jitter-seed',
    ]);
    expect(controlIdsOf(textContract)).toEqual([
      'point-text-align',
      'point-text-lineHeight',
      'point-text-maxTextWidth',
      'point-text-textField',
      'point-text-displayFormat',
      'point-text-resolveLabel',

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
      'point-node-show-relations',
      'point-node-shape-cornerRadius',
      'point-node-shape-scale',
      'point-node-shape-padding',
      'point-node-shape-margin',
      'point-node-shape-boundary',

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
        'point-jitter-span-kind': spanKind,
      }).flatMap(section => section.controls.map(control => control.id));

    expect(visibleIds('ratio')).toContain('point-jitter-ratio');
    expect(visibleIds('ratio')).not.toContain('point-jitter-range');
    expect(visibleIds('range')).toContain('point-jitter-range');
    expect(visibleIds('range')).not.toContain('point-jitter-ratio');
  });

  it('normal 分布才显示 sigma 控件', () => {
    const visibleIds = (distribution: string) =>
      resolveVisiblePreviewControlSections(cartesianJitterContract.controls.sections, {
        'point-jitter-distribution': distribution,
      }).flatMap(section => section.controls.map(control => control.id));

    expect(visibleIds('uniform')).not.toContain('point-jitter-sigma');
    expect(visibleIds('normal')).toContain('point-jitter-sigma');
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
