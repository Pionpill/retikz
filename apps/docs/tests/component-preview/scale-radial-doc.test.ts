import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  previewControlContract,
  scaleRadialControls,
} from '../../src/modules/docs/contents/viz/plot/scale/position/scale-radial.controls';
import Demo from '../../src/modules/docs/contents/viz/plot/scale/position/scale-radial.demo';
import {
  previewControlContract as englishPreviewControlContract,
  scaleRadialControls as englishScaleRadialControls,
} from '../../src/modules/docs/contents/viz/plot/scale/position/scale-radial.en.controls';

type Point = {
  x: number;
  y: number;
};

const radialFigurePaths = (): Array<Array<string>> => {
  const markup = renderToStaticMarkup(createElement(Demo));
  return Array.from(markup.matchAll(/<figure[^>]*>([\s\S]*?)<\/figure>/g), figureMatch =>
    Array.from(figureMatch[1].matchAll(/<path d="([^"]+)"/g), pathMatch => pathMatch[1]),
  );
};

const movePointOf = (pathData: string): Point => {
  const match = pathData.match(/^M ([\d.-]+) ([\d.-]+)/);
  if (match === null) throw new Error('Expected sector path move point');
  return { x: Number(match[1]), y: Number(match[2]) };
};

const innerStartKeys = (paths: Array<string>): Array<string> =>
  [...new Set(paths.map(path => movePointOf(path)).map(point => `${point.x},${point.y}`))].sort();

const maximumOuterRadius = (paths: Array<string>): number =>
  Math.max(...paths.flatMap(path => Array.from(path.matchAll(/ A ([\d.-]+) ([\d.-]+)/g), match => Number(match[1]))));

describe('径向位置比例尺文档 playground', () => {
  it('使用数据预设驱动并排的 linear / radial 对照', () => {
    const chineseControls = scaleRadialControls.sections.flatMap(section =>
      section.controls.map(control => ({ id: control.id, kind: control.kind })),
    );
    const englishControls = englishScaleRadialControls.sections.flatMap(section =>
      section.controls.map(control => ({ id: control.id, kind: control.kind })),
    );

    expect(chineseControls).toEqual([
      { id: 'dataPreset', kind: 'select' },
      { id: 'squareSteps', kind: 'table' },
      { id: 'evenSteps', kind: 'table' },
      { id: 'rainfall', kind: 'table' },
    ]);
    expect(englishControls).toEqual(chineseControls);
    expect(previewControlContract.canonicalValues).toEqual({ dataPreset: 'square' });
    expect(englishPreviewControlContract.canonicalValues).toEqual(previewControlContract.canonicalValues);
  });

  it('只展示当前数据预设对应的表格', () => {
    const tables = scaleRadialControls.sections
      .flatMap(section => section.controls)
      .filter(control => control.kind === 'table');

    expect(tables).toMatchObject([
      { id: 'squareSteps', visibleWhen: { controlId: 'dataPreset', oneOf: ['square'] } },
      { id: 'evenSteps', visibleWhen: { controlId: 'dataPreset', oneOf: ['even'] } },
      { id: 'rainfall', visibleWhen: { controlId: 'dataPreset', oneOf: ['rainfall'] } },
    ]);
  });

  it('linear 与 radial 都从同一个零半径基线开始', () => {
    const [linearPaths, radialPaths] = radialFigurePaths();

    expect(linearPaths).toHaveLength(4);
    expect(radialPaths).toHaveLength(4);
    expect(innerStartKeys(linearPaths)).toEqual(innerStartKeys(radialPaths));
    expect(innerStartKeys(linearPaths)).toHaveLength(1);
  });

  it('linear 与 radial 的最大值使用同一外半径', () => {
    const [linearPaths, radialPaths] = radialFigurePaths();

    expect(maximumOuterRadius(linearPaths)).toBeCloseTo(maximumOuterRadius(radialPaths), 6);
  });
});
