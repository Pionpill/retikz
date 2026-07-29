import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pointRoot = resolve('src/modules/docs/contents/viz/plot/mark/point');
const chinesePage = readFileSync(resolve(pointRoot, 'index.zh.mdx'), 'utf8');
const englishPage = readFileSync(resolve(pointRoot, 'index.en.mdx'), 'utf8');

const readPointFile = (name: string): string => readFileSync(resolve(pointRoot, name), 'utf8');

describe('PointMark 示例渐进结构', () => {
  it('只保留四个渐进核心能力', () => {
    const headingGroups = [
      ['### 基础用法', '### 样式变换', '### 文本标签', '### 节点形态'],
      ['### Basic Usage', '### Style Variations', '### Labels and Text Points', '### Node Shapes'],
    ];

    for (const [page, headings] of [
      [chinesePage, headingGroups[0]],
      [englishPage, headingGroups[1]],
    ] as const) {
      const positions = headings.map(heading => page.indexOf(heading));

      expect(positions.every(position => position >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(page).not.toContain('point-coordinate-1d');
      expect(page).not.toContain('point-transform');
    }
  });

  it('把 shape 从样式 playground 拆到独立节点形态 playground', () => {
    const nodeDemoPath = resolve(pointRoot, 'point-node-shape.demo.tsx');
    const chineseControlsPath = resolve(pointRoot, 'point-node-shape.controls.ts');
    const englishControlsPath = resolve(pointRoot, 'point-node-shape.en.controls.ts');

    expect(existsSync(nodeDemoPath)).toBe(true);
    expect(existsSync(chineseControlsPath)).toBe(true);
    expect(existsSync(englishControlsPath)).toBe(true);

    expect(readPointFile('point-style.controls.ts')).not.toContain('point-shape');
    expect(readPointFile('point-style.demo.tsx')).not.toContain('POINT_STYLE_CONTROL_IDS.shape');

    if (!existsSync(nodeDemoPath) || !existsSync(chineseControlsPath) || !existsSync(englishControlsPath)) return;

    const demo = readFileSync(nodeDemoPath, 'utf8');
    const chineseControls = readFileSync(chineseControlsPath, 'utf8');
    const englishControls = readFileSync(englishControlsPath, 'utf8');

    expect(demo).toContain('pointNodeShapeOf');
    expect(demo).toContain('shape={pointNodeShapeOf');
    expect(chineseControls).toContain("type: 'star'");
    expect(chineseControls).toContain("type: 'polygon'");
    expect(englishControls).toContain('POINT_NODE_SHAPE_CONTROL_IDS');
  });
});
