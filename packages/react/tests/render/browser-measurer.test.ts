import { describe, expect, it } from 'vitest';
import { fallbackMeasurer } from '@retikz/core';
import { browserMeasurer } from '../../src/render/browser-measurer';

/**
 * vitest 用的是 node 环境（见 vite.config.ts: test.environment = 'node'），
 * 这里没有 document，browserMeasurer 内部 getCtx 应当返回 null，整体降级到 fallbackMeasurer。
 * 浏览器路径（canvas measureText）的测试需要 jsdom 环境，留给 e2e / 集成测。
 */
describe('browserMeasurer (SSR / node 环境降级路径)', () => {
  it('无 document 时与 fallbackMeasurer 输出完全一致', () => {
    expect(browserMeasurer('hello', { size: 14 })).toEqual(fallbackMeasurer('hello', { size: 14 }));
  });

  it('空字符串、长串、不同 font 均与 fallback 对齐', () => {
    const cases = [
      { text: '', font: { size: 12 } },
      { text: 'a', font: { size: 16, weight: 'bold' } },
      { text: 'abcdefghijklmnop', font: { size: 10, family: 'serif', style: 'italic' as const } },
    ];
    for (const { text, font } of cases) {
      expect(browserMeasurer(text, font)).toEqual(fallbackMeasurer(text, font));
    }
  });
});
