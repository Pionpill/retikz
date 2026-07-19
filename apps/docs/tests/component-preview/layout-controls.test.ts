import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';

import { layoutViewboxControls as layoutViewboxZhControls } from '../../src/modules/docs/contents/kernel/components/layout/overview/layout-viewbox.controls';
import { layoutViewboxControls as layoutViewboxEnControls } from '../../src/modules/docs/contents/kernel/components/layout/overview/layout-viewbox.en.controls';
import {
  ScopeTransformVisibleWhen,
  scopeTranslateBasicControls,
} from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-translate-basic.controls';
import { scopeTranslateBasicEnControls } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-translate-basic.en.controls';

const getFields = (definition: PreviewControlsDefinition) => {
  expect(definition.presentation).toBe('panel');
  if (definition.presentation !== 'panel') throw new Error('Expected panel controls');
  return definition.sections.flatMap(section => section.controls);
};

const contractOf = (definition: PreviewControlsDefinition) =>
  getFields(definition).map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    visibleWhen: field.visibleWhen,
    options: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
  }));

describe('Layout controls contracts', () => {
  it('keeps Layout viewBox field contracts aligned across locales', () => {
    expect(contractOf(layoutViewboxEnControls)).toEqual(contractOf(layoutViewboxZhControls));
    expect(getFields(layoutViewboxZhControls).map(field => field.id)).toEqual([
      'width',
      'height',
      'viewBoxX',
      'viewBoxY',
      'viewBoxWidth',
      'viewBoxHeight',
    ]);
  });

  it('keeps all Scope transform kinds and conditional fields aligned across locales', () => {
    expect(contractOf(scopeTranslateBasicEnControls)).toEqual(contractOf(scopeTranslateBasicControls));

    const fields = getFields(scopeTranslateBasicControls);
    const transformKind = fields.find(field => field.id === 'transformKind');
    expect(transformKind).toMatchObject({ kind: 'select', defaultValue: 'translate' });
    if (!transformKind || transformKind.kind !== 'select') throw new Error('Missing transform kind select');
    expect(transformKind.options.map(option => option.value)).toEqual([
      'translate',
      'polar-translate',
      'at-translate',
      'offset-translate',
      'between-translate',
      'rotate',
      'scale',
    ]);

    expect(
      Object.fromEntries(fields.filter(field => field.visibleWhen).map(field => [field.id, field.visibleWhen])),
    ).toEqual({
      referent: ScopeTransformVisibleWhen.Referent,
      translateX: ScopeTransformVisibleWhen.Translate,
      translateY: ScopeTransformVisibleWhen.Translate,
      offsetX: ScopeTransformVisibleWhen.OffsetTranslate,
      offsetY: ScopeTransformVisibleWhen.OffsetTranslate,
      polarAngle: ScopeTransformVisibleWhen.PolarTranslate,
      distance: ScopeTransformVisibleWhen.Distance,
      direction: ScopeTransformVisibleWhen.AtTranslate,
      fraction: ScopeTransformVisibleWhen.BetweenTranslate,
      rotateDegrees: ScopeTransformVisibleWhen.Rotate,
      rotateCenterX: ScopeTransformVisibleWhen.Rotate,
      rotateCenterY: ScopeTransformVisibleWhen.Rotate,
      scaleX: ScopeTransformVisibleWhen.Scale,
      scaleY: ScopeTransformVisibleWhen.Scale,
    });
  });
});
