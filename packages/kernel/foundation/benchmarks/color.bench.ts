import { compositeOpaqueColor, parseStaticCssColor, RetikzFoundationError } from '@retikz/foundation';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import { captureFailure } from './_workloads';

for (const [name, input, expected] of [
  ['命名色', 'red', { r: 1, g: 0, b: 0, a: 1 }],
  ['透明色', 'transparent', { r: 0, g: 0, b: 0, a: 0 }],
  ['短 HEX', '#f00', { r: 1, g: 0, b: 0, a: 1 }],
  ['长 HEX', '#ff0000', { r: 1, g: 0, b: 0, a: 1 }],
  ['HEX 透明度', '#ff000080', { r: 1, g: 0, b: 0, a: 128 / 255 }],
  ['RGB 逗号', 'rgba(255, 0, 0, 0.5)', { r: 1, g: 0, b: 0, a: 0.5 }],
  ['RGB 空格', 'rgb(100% 0% 0% / 50%)', { r: 1, g: 0, b: 0, a: 0.5 }],
  ['HSL 逗号', 'hsl(0, 100%, 50%)', { r: 1, g: 0, b: 0, a: 1 }],
  ['HSL 空格', 'hsl(0 100% 50% / 50%)', { r: 1, g: 0, b: 0, a: 0.5 }],
  ['不支持宿主色', 'var(--color)', null],
  ['非法通道', 'rgb(no 0 0)', null],
] as const) {
  defineBenchmark({ id: `parseStaticCssColor/${name}`, dimensions: ['颜色解析', name, '单颜色'] }, () => ({
    run: () => parseStaticCssColor(input),
    verify: result => expect(result).toEqual(expected),
  }));
}
for (const [name, foreground, backdrop, weight, expected] of [
  ['HEX', '#ff0000', '#ffffff', 0.5, '#ff8080'],
  ['透明前景', 'rgba(255, 0, 0, 0.5)', 'white', 0.5, '#ffbfbf'],
  ['HSL', 'hsl(0 100% 50%)', 'rgb(255 255 255)', 0.5, '#ff8080'],
  ['零权重', 'red', 'white', 0, '#ffffff'],
  ['全权重', 'red', 'white', 1, '#ff0000'],
] as const) {
  defineBenchmark({ id: `compositeOpaqueColor/${name}`, dimensions: ['颜色预合成', name, '单次'] }, () => ({
    run: () => compositeOpaqueColor(foreground, backdrop, weight),
    verify: result => expect(result).toBe(expected),
  }));
}
for (const [name, foreground, backdrop, weight] of [
  ['非法权重', 'red', 'white', -1],
  ['动态前景', 'currentColor', 'white', 0.5],
  ['透明底色', 'red', 'transparent', 0.5],
] as const) {
  defineBenchmark({ id: `compositeOpaqueColor/invalid-${name}`, dimensions: ['颜色预合成', name, '单次拒绝'] }, () => ({
    run: () => captureFailure(() => compositeOpaqueColor(foreground, backdrop, weight)),
    verify: result => expect(result).toBeInstanceOf(RetikzFoundationError),
  }));
}
