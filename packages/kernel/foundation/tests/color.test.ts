import * as foundation from '@retikz/foundation';
import { RetikzFoundationError, RetikzFoundationErrorCode } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

type ParseStaticCssColor = (input: string) => Readonly<{ r: number; g: number; b: number; a: number }> | null;

type CompositeOpaqueColor = (foreground: string, backdrop: string, weight: number) => `#${string}`;

type NamedColorHexLookup = Readonly<Record<string, `#${string}`>>;

const parseStaticCssColor = (input: string): ReturnType<ParseStaticCssColor> => {
  const candidate = (foundation as Record<string, unknown>).parseStaticCssColor;

  expect(candidate).toEqual(expect.any(Function));
  return (candidate as ParseStaticCssColor)(input);
};

const compositeOpaqueColor = (foreground: string, backdrop: string, weight: number): `#${string}` => {
  const candidate = (foundation as Record<string, unknown>).compositeOpaqueColor;

  expect(candidate).toEqual(expect.any(Function));
  return (candidate as CompositeOpaqueColor)(foreground, backdrop, weight);
};

const staticCssNamedColorHexByName = (): NamedColorHexLookup => {
  const candidate = (foundation as Record<string, unknown>).staticCssNamedColorHexByName;

  expect(candidate).toEqual(expect.any(Object));
  return candidate as NamedColorHexLookup;
};

const captureFoundationError = (operation: () => unknown): RetikzFoundationError => {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(RetikzFoundationError);
    return error as RetikzFoundationError;
  }

  throw new Error('Expected operation to throw RetikzFoundationError');
};

describe('parseStaticCssColor', () => {
  it.each([
    ['short hex', '#369', { r: 0x33 / 255, g: 0x66 / 255, b: 0x99 / 255, a: 1 }],
    ['named color', 'darkorange', { r: 1, g: 0x8c / 255, b: 0, a: 1 }],
    ['legacy rgb', 'rgb(51, 102, 153)', { r: 0.2, g: 0.4, b: 0.6, a: 1 }],
    ['modern rgb with alpha', 'rgb(255 0 0 / 50%)', { r: 1, g: 0, b: 0, a: 0.5 }],
    ['legacy hsl', 'hsla(120, 100%, 50%, 0.25)', { r: 0, g: 1, b: 0, a: 0.25 }],
    ['modern hsl', 'hsl(240 100% 50%)', { r: 0, g: 0, b: 1, a: 1 }],
    ['transparent', 'transparent', { r: 0, g: 0, b: 0, a: 0 }],
  ])('解析 %s，不依赖于宿主 CSS 环境', (_name, input, expected) => {
    expect(parseStaticCssColor(input)).toEqual(expected);
  });

  it.each(['currentColor', 'var(--accent)', 'CanvasText', 'color(display-p3 1 0 0)', ''])(
    '对于动态或不支持的颜色 %s 返回 null',
    input => {
      expect(parseStaticCssColor(input)).toBeNull();
    },
  );
});

describe('staticCssNamedColorHexByName', () => {
  it('公开从命名颜色解析器源派生的冻结清单', () => {
    const namedColorHexByName = staticCssNamedColorHexByName();

    expect(Object.isFrozen(namedColorHexByName)).toBe(true);
    expect(namedColorHexByName).toMatchObject({
      darkorange: '#ff8c00',
      rebeccapurple: '#663399',
    });
    expect(namedColorHexByName).not.toHaveProperty('transparent');
    expect(Object.keys(namedColorHexByName)).toHaveLength(148);
  });
});

describe('compositeOpaqueColor', () => {
  it('在不透明的浅色和深色背景上预合成标准化前景权重', () => {
    expect(compositeOpaqueColor('#336699', '#ffffff', 0.6)).toBe('#85a3c2');
    expect(compositeOpaqueColor('#336699', '#000000', 0.4)).toBe('#14293d');
    expect(compositeOpaqueColor('#336699', '#ffffff', 0)).toBe('#ffffff');
    expect(compositeOpaqueColor('#336699', '#000000', 1)).toBe('#336699');
  });

  it('在产生不透明颜色之前将前景 alpha 乘以权重', () => {
    expect(compositeOpaqueColor('rgb(255 0 0 / 50%)', '#ffffff', 0.4)).toBe('#ffcccc');
    expect(compositeOpaqueColor('hsl(120 100% 50%)', '#000000', 0.5)).toBe('#008000');
  });

  it.each([
    ['foreground', 'currentColor', '#ffffff', 0.4, 'currentColor'],
    ['backdrop', '#336699', 'var(--surface)', 0.4, 'var(--surface)'],
    ['backdrop', '#336699', 'rgb(255 255 255 / 50%)', 0.4, 'rgb(255 255 255 / 50%)'],
    ['weight', '#336699', '#ffffff', -0.1, -0.1],
    ['weight', '#336699', '#ffffff', 1.1, 1.1],
    ['weight', '#336699', '#ffffff', Number.NaN, Number.NaN],
  ] as const)('报告原始无效的 %s 输入', (input, foreground, backdrop, weight, value) => {
    const error = captureFoundationError(() => compositeOpaqueColor(foreground, backdrop, weight));

    expect(error.code).toBe(RetikzFoundationErrorCode.Color);
    expect(error.details).toEqual({ input, value });
  });
});
