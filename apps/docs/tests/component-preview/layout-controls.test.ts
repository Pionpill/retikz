import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlsDefinition,
  PreviewControlValues,
} from '../../src/modules/docs/components/component-preview';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import { layoutViewboxControls as layoutViewboxZhControls } from '../../src/modules/docs/contents/kernel/components/layout/overview/layout-viewbox.controls';
import LayoutViewboxDemo from '../../src/modules/docs/contents/kernel/components/layout/overview/layout-viewbox.demo';
import { layoutViewboxControls as layoutViewboxEnControls } from '../../src/modules/docs/contents/kernel/components/layout/overview/layout-viewbox.en.controls';
import {
  previewControlContract as scopeTranslateBasicContract,
  ScopeTransformVisibleWhen,
  scopeTranslateBasicControls,
} from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-translate-basic.controls';
import {
  previewControlContract as scopeTranslateBasicEnContract,
  scopeTranslateBasicEnControls,
} from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-translate-basic.en.controls';

const getFields = (definition: PreviewControlsDefinition) => {
  expect(definition.presentation).toBe('panel');
  if (definition.presentation !== 'panel') throw new Error('Expected panel controls');
  return definition.sections.flatMap(section => section.controls);
};

const layoutContentRoot = resolve('src/modules/docs/contents/kernel/components/layout');
const readLayoutContent = (path: string): string => readFileSync(resolve(layoutContentRoot, path), 'utf8');

const contractOf = (definition: PreviewControlsDefinition) =>
  getFields(definition).map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    visibleWhen: field.visibleWhen,
    options: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
  }));

const renderLayoutViewboxDemo = (values: PreviewControlValues): string =>
  renderToStaticMarkup(
    createElement(
      PreviewControlStateContext.Provider,
      {
        value: {
          canonicalValues: values,
          values,
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        },
      },
      createElement(LayoutViewboxDemo),
    ),
  );

const extractLightgrayGuidePath = (markup: string): string => {
  const tag = markup.match(/<path\b[^>]*stroke="lightgray"[^>]*>/)?.[0];
  const path = tag?.match(/\sd="([^"]+)"/)?.[1];
  if (!path) throw new Error('Missing lightgray viewBox guide path');
  return path;
};

describe('Layout controls contracts', () => {
  it('Scope 变换 contract 指向公开 transforms 属性', () => {
    expect(scopeTranslateBasicContract.relatedApis).toEqual(['Scope.transforms']);
    expect(scopeTranslateBasicEnContract.relatedApis).toEqual(['Scope.transforms']);
  });

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

  it('keeps controls playground output within the 400px interaction budget', () => {
    for (const definition of [layoutViewboxZhControls, layoutViewboxEnControls]) {
      const width = getFields(definition).find(field => field.id === 'width');

      expect(width).toMatchObject({ kind: 'range', min: 180, max: 400, step: 10 });
    }

    expect(readLayoutContent('scope/scope-id-reference.demo.tsx')).toContain('<Layout width={400} height={200}');
    expect(readLayoutContent('scope/scope-local-namespace-basic.demo.tsx')).toContain(
      '<Layout width={400} height={117}',
    );
    expect(readLayoutContent('scope/scope-translate-basic.demo.tsx')).toContain('<Layout width={400} height={217}');
  });

  it('makes display and viewBox boundaries independently observable', () => {
    const canonical = renderLayoutViewboxDemo({
      width: 300,
      height: 200,
      viewBoxX: -120,
      viewBoxY: -120,
      viewBoxWidth: 240,
      viewBoxHeight: 240,
    });
    const widerViewBox = renderLayoutViewboxDemo({
      width: 300,
      height: 200,
      viewBoxX: -120,
      viewBoxY: -120,
      viewBoxWidth: 400,
      viewBoxHeight: 240,
    });

    expect(canonical).toMatch(/^<svg[^>]*style="[^"]*outline:1px dashed gray/);
    expect(extractLightgrayGuidePath(widerViewBox)).not.toBe(extractLightgrayGuidePath(canonical));
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
