// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { createPreviewOutput, fitPreviewOutput } from '../src/playground/modules/kernel/browser';

describe('Performance Lab preview output', () => {
  it.each(['svg', 'canvas'] as const)('保留 %s 输出尺寸并等比适配舞台', tagName => {
    const host = document.createElement('div');
    const output =
      tagName === 'svg'
        ? document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        : document.createElement('canvas');
    output.setAttribute('width', '3840');
    output.setAttribute('height', '2160');
    host.append(output);

    fitPreviewOutput(host);

    expect(output.getAttribute('width')).toBe('3840');
    expect(output.getAttribute('height')).toBe('2160');
    expect(output.style).toMatchObject({
      display: 'block',
      width: 'auto',
      height: 'auto',
      maxWidth: '100%',
      maxHeight: '100%',
    });
  });

  it('拒绝超过 4K 总像素预算的 renderer 输出', () => {
    expect(() => createPreviewOutput(8192, 8192)).toThrow('Kernel Lab preview size is invalid');
  });
});
