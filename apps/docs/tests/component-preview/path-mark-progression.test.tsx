import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pathRoot = resolve('src/modules/docs/contents/viz/plot/mark/path');
const chinesePage = readFileSync(resolve(pathRoot, 'index.zh.mdx'), 'utf8');
const englishPage = readFileSync(resolve(pathRoot, 'index.en.mdx'), 'utf8');

describe('PathMark 示例渐进结构', () => {
  it('按单路径到边界行为只保留五个核心 playground', () => {
    const cases = [
      {
        page: chinesePage,
        headings: ['### 基础用法', '### 系列与标签', '### 连接与样式', '### 闭合与填充', '### 缺失值处理'],
      },
      {
        page: englishPage,
        headings: [
          '### Basic Usage',
          '### Series and Labels',
          '### Connection and Style',
          '### Closure and Fill',
          '### Missing Values',
        ],
      },
    ];

    for (const { page, headings } of cases) {
      const positions = headings.map(heading => page.indexOf(heading));

      expect(positions.every(position => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(page.match(/<ComponentPreview/g)).toHaveLength(5);
      expect(page).not.toContain("files={['line-color-split'");
      expect(page).not.toContain("files={['line-transform'");
      expect(page).not.toContain("files={['line-paint'");
      expect(page).not.toContain("files={['line-radar'");
      expect(page).not.toContain("files={['line-stack-area'");
    }
  });
});
