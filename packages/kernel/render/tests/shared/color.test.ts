import { describe, expect, it } from 'vitest';

import { parseHexColor } from '../../src/shared/color';

describe('parseHexColor', () => {
  it('将十六进制通道解析为字节', () => {
    expect(parseHexColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('在解析之前扩展 hex3', () => {
    expect(parseHexColor('#abc')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
  });

  it('修剪周围的空白', () => {
    expect(parseHexColor('  #000000  ')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('对于非十六进制颜色返回 null', () => {
    expect(parseHexColor('rgb(1, 2, 3)')).toBeNull();
    expect(parseHexColor('red')).toBeNull();
  });
});
