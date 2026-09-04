import { describe, expect, it } from 'vitest';

import {
  resolveHighlightLanguage,
  tokenizeHighlightCode,
} from '@/modules/docs/components/highlight-code/shiki-highlighter';

const lineContents = (lines: Awaited<ReturnType<typeof tokenizeHighlightCode>>): Array<string> =>
  lines.map(line => line.map(token => token.content).join(''));

describe('Shiki 代码高亮', () => {
  it('将未知语言回退为纯文本并保留空行', async () => {
    expect(resolveHighlightLanguage('mermaid')).toBe('text');

    const lines = await tokenizeHighlightCode({
      code: 'alpha\n\nomega',
      lang: 'mermaid',
      theme: 'light',
    });

    expect(lineContents(lines)).toEqual(['alpha', '', 'omega']);
  });

  it('使用 TypeScript grammar 产出可逐行渲染的语义 token', async () => {
    const lines = await tokenizeHighlightCode({
      code: 'const point: [number, number] = [1, 2];',
      lang: 'ts',
      theme: 'dark',
    });

    expect(lineContents(lines)).toEqual(['const point: [number, number] = [1, 2];']);
    expect(lines[0].length).toBeGreaterThan(1);
    expect(lines[0].some(token => token.color !== undefined)).toBe(true);
  });

  it.each([
    ['dark', '#4FC1FF'],
    ['light', '#0070C1'],
  ] as const)('为 %s 模式应用 Plus 调色板', async (theme, pointColor) => {
    const lines = await tokenizeHighlightCode({
      code: 'const point: number = 1;',
      lang: 'typescript',
      theme,
    });

    expect(lines[0].find(token => token.content === 'point')?.color).toBe(pointColor);
  });
});
