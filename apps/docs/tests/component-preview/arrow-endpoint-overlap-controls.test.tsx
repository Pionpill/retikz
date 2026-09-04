import type { FC, ReactNode } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '../../src/modules/docs/components/component-preview';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import {
  resolveControlsKey,
  resolveDemoKey,
  resolvePreviewControlContract,
} from '../../src/modules/docs/components/component-preview/registry';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { controlModules, demoModules } from './load-preview-registry';

const segments = ['kernel', 'components', 'draw', 'arrow'];
const name = 'arrow-endpoint-overlap';

const demoModule = demoModules[resolveDemoKey(segments, name, 'zh')];
const chineseContract = resolvePreviewControlContract(controlModules[resolveControlsKey(segments, name, 'zh')]);
const englishContract = resolvePreviewControlContract(controlModules[resolveControlsKey(segments, name, 'en')]);

const renderWithValues = (Component: FC, values: PreviewControlValues) => {
  if (chineseContract === undefined) return '';
  return renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues: chineseContract.canonicalValues,
        values: { ...chineseContract.canonicalValues, ...values },
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <Component />
    </PreviewControlStateContext.Provider>,
  );
};

describe('Arrow endpoint-overlap controlled demo', () => {
  it('提供中英文一致的 Core 箭头形状与 overlap 范围契约', () => {
    expect(chineseContract).toBeDefined();
    expect(chineseContract?.canonicalValues).toEqual({ shape: 'openCircle', overlap: 0.5 });
    expect(chineseContract?.relatedApis).toEqual(['Draw.arrowDetail', 'Draw.arrowPlacement']);
    expect(englishContract?.canonicalValues).toEqual(chineseContract?.canonicalValues);
    expect(englishContract?.relatedApis).toEqual(chineseContract?.relatedApis);

    const chineseControls = chineseContract?.controls;
    const englishControls = englishContract?.controls;
    expect(chineseControls?.presentation).toBe('panel');
    expect(englishControls?.presentation).toBe('panel');
    if (chineseControls?.presentation !== 'panel' || englishControls?.presentation !== 'panel') return;

    const chineseShapeControl = chineseControls.sections
      .flatMap(section => section.controls)
      .find(control => control.id === 'shape');
    const englishShapeControl = englishControls.sections
      .flatMap(section => section.controls)
      .find(control => control.id === 'shape');

    expect(chineseShapeControl).toMatchObject({ kind: 'select', defaultValue: 'openCircle' });
    expect(englishShapeControl).toMatchObject({ kind: 'select', defaultValue: 'openCircle' });
    if (chineseShapeControl?.kind !== 'select' || englishShapeControl?.kind !== 'select') return;

    const builtinShapes = ['normal', 'open', 'stealth', 'openStealth', 'circle', 'openCircle'];
    expect(chineseShapeControl.options.map(option => option.value)).toEqual(builtinShapes);
    expect(englishShapeControl.options.map(option => option.value)).toEqual(builtinShapes);
  });

  it('canonical 画面只保留一个箭头，并连接到带 pattern 的矩形', () => {
    const canonicalRender = demoModule?.previewSource?.canonicalRender;
    expect(canonicalRender).toBeTypeOf('function');
    if (canonicalRender === undefined) return;

    const CanonicalDemo = (): ReactNode => canonicalRender();
    const ir = buildPreviewIR(CanonicalDemo).ir;

    expect(ir.children).toMatchObject([
      { type: 'coordinate', id: 'A' },
      {
        type: 'node',
        id: 'B',
        shape: 'rectangle',
        fill: { kind: 'pattern' },
      },
      {
        type: 'path',
        marks: [{ pos: 1, endpointOverlap: 0.5, mark: { kind: 'arrow', shape: 'openCircle' } }],
      },
    ]);
  });

  it('滑块改变箭头进入深度，同时保持固定取景和 pattern 矩形', () => {
    const Demo = demoModule?.default;
    expect(Demo).toBeTypeOf('function');
    expect(chineseContract).toBeDefined();
    if (Demo === undefined || chineseContract === undefined) return;

    const outside = renderWithValues(Demo, { overlap: 0 });
    const inside = renderWithValues(Demo, { overlap: 1 });

    expect(outside).not.toBe(inside);
    expect(outside).toContain('viewBox="-170 -75 340 150"');
    expect(inside).toContain('viewBox="-170 -75 340 150"');
    expect(outside).toContain('<pattern');
    expect(inside).toContain('<pattern');
    expect(outside.match(/marker-end=/g)).toHaveLength(1);
    expect(inside.match(/marker-end=/g)).toHaveLength(1);
  });

  it('切换 Core 箭头形状，同时保持单箭头、重叠比例与 Pattern 矩形', () => {
    const Demo = demoModule?.default;
    expect(Demo).toBeTypeOf('function');
    expect(chineseContract).toBeDefined();
    if (Demo === undefined || chineseContract === undefined) return;

    const normal = renderWithValues(Demo, { shape: 'normal', overlap: 0.5 });
    const openCircle = renderWithValues(Demo, { shape: 'openCircle', overlap: 0.5 });

    expect(normal).not.toBe(openCircle);
    for (const markup of [normal, openCircle]) {
      expect(markup).toContain('viewBox="-170 -75 340 150"');
      expect(markup).toContain('<pattern');
      expect(markup.match(/marker-end=/g)).toHaveLength(1);
    }
  });
});
