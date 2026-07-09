import { describe, expect, it } from 'vitest';

import { parseHexColor } from '../../src/shared/color';

describe('parseHexColor', () => {
  it('parses hex6 channels into bytes', () => {
    expect(parseHexColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('expands hex3 before parsing', () => {
    expect(parseHexColor('#abc')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
  });

  it('trims surrounding whitespace', () => {
    expect(parseHexColor('  #000000  ')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('returns null for non-hex colors', () => {
    expect(parseHexColor('rgb(1, 2, 3)')).toBeNull();
    expect(parseHexColor('red')).toBeNull();
  });
});
