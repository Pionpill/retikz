import { describe, expect, it } from 'vitest';

import type {
  PreviewControlContract,
  PreviewControlsDefinition,
} from '../../src/modules/docs/components/component-preview/types';

import { previewControlContract as curveContract } from '../../src/modules/docs/contents/kernel/packages/math/algorithms/curve-playground.controls';
import { previewControlContract as curveEnContract } from '../../src/modules/docs/contents/kernel/packages/math/algorithms/curve-playground.en.controls';
import { previewControlContract as intersectionContract } from '../../src/modules/docs/contents/kernel/packages/math/algorithms/intersection-playground.controls';
import {
  circleCircleCenters,
  intersectionViewBox,
} from '../../src/modules/docs/contents/kernel/packages/math/algorithms/intersection-playground.data';
import { previewControlContract as intersectionEnContract } from '../../src/modules/docs/contents/kernel/packages/math/algorithms/intersection-playground.en.controls';
import { previewControlContract as vectorContract } from '../../src/modules/docs/contents/kernel/packages/math/primitives/vector-normal.controls';
import { previewControlContract as vectorEnContract } from '../../src/modules/docs/contents/kernel/packages/math/primitives/vector-normal.en.controls';

const fieldContractOf = (definition: PreviewControlsDefinition) => {
  const fields =
    definition.presentation === 'panel'
      ? definition.sections.flatMap(section => section.controls)
      : definition.controls;

  return fields.map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    min: 'min' in field ? field.min : undefined,
    max: 'max' in field ? field.max : undefined,
    step: 'step' in field ? field.step : undefined,
    visibleWhen: field.visibleWhen,
    optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
  }));
};

const expectBilingualContract = (zh: PreviewControlContract, en: PreviewControlContract) => {
  expect(zh.controls.presentation).toBe('panel');
  expect(en.controls.presentation).toBe('panel');
  expect(fieldContractOf(en.controls)).toEqual(fieldContractOf(zh.controls));
  expect(en.canonicalValues).toEqual(zh.canonicalValues);
  expect(en.presets?.map(preset => ({ id: preset.id, values: preset.values }))).toEqual(
    zh.presets?.map(preset => ({ id: preset.id, values: preset.values })),
  );
  expect(en.relatedApis).toEqual(zh.relatedApis);
};

describe('@retikz/math package controls', () => {
  it('向量 playground 提供双语一致的角度与长度契约', () => {
    expectBilingualContract(vectorContract, vectorEnContract);
    expect(fieldContractOf(vectorContract.controls).map(field => field.id)).toEqual(['angle', 'length']);
    expect(vectorContract.canonicalValues).toEqual({ angle: -30, length: 120 });
    expect(vectorContract.presets.map(preset => preset.id)).toEqual(['axis', 'diagonal', 'obtuse']);
    expect(vectorContract.relatedApis).toEqual([
      'point.add',
      'point.scale',
      'vector2.fromAngleDegrees',
      'vector2.normal',
    ]);
  });

  it('求交 playground 只显示当前算法有效的字段', () => {
    expectBilingualContract(intersectionContract, intersectionEnContract);
    const fields = fieldContractOf(intersectionContract.controls);

    expect(fields.map(field => field.id)).toEqual(['kind', 'offset', 'angle', 'radius']);
    expect(fields.find(field => field.id === 'angle')?.visibleWhen).toEqual({
      controlId: 'kind',
      oneOf: ['lineLine'],
    });
    expect(fields.find(field => field.id === 'radius')?.visibleWhen).toEqual({
      controlId: 'kind',
      oneOf: ['lineCircle', 'circleCircle'],
    });
    expect(intersectionContract.presets.map(preset => preset.id)).toEqual([
      'crossing-lines',
      'parallel-lines',
      'tangent-line-circle',
      'disjoint-circles',
    ]);
    expect(intersectionContract.relatedApis).toEqual([
      'intersect.lineLine',
      'intersect.lineCircle',
      'intersect.circleCircle',
    ]);
  });

  it('圆与圆的组合极值不会超出固定取景', () => {
    const fields = fieldContractOf(intersectionContract.controls);
    const offset = fields.find(field => field.id === 'offset');
    const radius = fields.find(field => field.id === 'radius');

    expect(offset?.min).toBe(-100);
    expect(offset?.max).toBe(100);
    expect(radius?.max).toBe(90);

    if (typeof offset?.min !== 'number' || typeof offset.max !== 'number' || typeof radius?.max !== 'number') {
      throw new Error('intersection controls must expose numeric offset and radius limits');
    }

    const viewBoxRight = intersectionViewBox.x + intersectionViewBox.width;
    const viewBoxBottom = intersectionViewBox.y + intersectionViewBox.height;

    for (const offsetValue of [offset.min, offset.max]) {
      for (const center of circleCircleCenters(offsetValue)) {
        expect(center[0] - radius.max).toBeGreaterThanOrEqual(intersectionViewBox.x);
        expect(center[0] + radius.max).toBeLessThanOrEqual(viewBoxRight);
        expect(center[1] - radius.max).toBeGreaterThanOrEqual(intersectionViewBox.y);
        expect(center[1] + radius.max).toBeLessThanOrEqual(viewBoxBottom);
      }
    }
  });

  it('曲线 playground 以点集和 tension 形成稳定状态', () => {
    expectBilingualContract(curveContract, curveEnContract);
    expect(fieldContractOf(curveContract.controls).map(field => field.id)).toEqual(['pointSet', 'tension']);
    expect(curveContract.canonicalValues).toEqual({ pointSet: 'uneven', tension: 1 });
    expect(curveContract.presets.map(preset => preset.id)).toEqual(['uneven', 'zigzag', 'coincident']);
    expect(curveContract.relatedApis).toEqual(['curve.catmullRomToCubic', 'CubicSegment']);
  });
});
