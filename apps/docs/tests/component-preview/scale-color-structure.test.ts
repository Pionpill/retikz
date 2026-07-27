import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { discretizationValues } from '../../src/modules/docs/contents/viz/plot/scale/color/scale-discretization.data';

const scaleColorRoot = resolve('src/modules/docs/contents/viz/plot/scale/color');
const chinesePage = readFileSync(resolve(scaleColorRoot, 'index.zh.mdx'), 'utf8');
const englishPage = readFileSync(resolve(scaleColorRoot, 'index.en.mdx'), 'utf8');

const readRequiredFile = (name: string): string => {
  const path = resolve(scaleColorRoot, name);

  expect(existsSync(path), `${name} should exist`).toBe(true);
  return readFileSync(path, 'utf8');
};

describe('颜色比例尺文档结构', () => {
  it('离散化小节接入独立可交互 demo', () => {
    for (const page of [chinesePage, englishPage]) {
      expect(page).toContain("files={['scale-discretization', 'scale-discretization.data.ts']}");
      expect(page).toContain('caption=');
    }

    readRequiredFile('scale-discretization.data.ts');
    readRequiredFile('scale-discretization.controls.ts');
    readRequiredFile('scale-discretization.en.controls.ts');
    const demo = readRequiredFile('scale-discretization.demo.tsx');

    expect(demo).toContain("type: 'quantize'");
    expect(demo).toContain("type: 'threshold'");
    expect(demo).toContain("type: 'quantile'");
  });

  it('离散化 demo 使用 30 个独立横向位置的样本', () => {
    expect(discretizationValues).toHaveLength(30);
    expect(discretizationValues.map(datum => datum.x)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
  });

  it('双语页以技术原理替代实现依据并接入有边框逻辑图', () => {
    expect(chinesePage).toContain('## 技术原理\n');
    expect(englishPage).toContain('## How it works\n');
    expect(chinesePage).not.toContain('## React DSL 与 full spec');
    expect(chinesePage).not.toContain('## 实现依据');
    expect(englishPage).not.toContain('## React DSL and the full spec');
    expect(englishPage).not.toContain('## Implementation sources');

    expect(chinesePage).toContain('<ComponentPreview files="scale-color-flow" size="xs" hideCode />');
    expect(englishPage).toContain('<ComponentPreview files="scale-color-flow" size="xs" hideCode />');

    const flowDemo = readRequiredFile('scale-color-flow.demo.tsx');
    const nodeTags = flowDemo.match(/<Node[\s\S]*?>/g) ?? [];

    expect(nodeTags.length).toBeGreaterThan(0);
    for (const nodeTag of nodeTags) {
      expect(nodeTag).toContain('stroke="gray"');
      expect(nodeTag).toContain('fill="gray"');
      expect(nodeTag).toContain('fillOpacity={0.08}');
      expect(nodeTag).toContain('cornerRadius={4}');
    }
  });

  it('连续颜色 playground 只负责 sequential 与 diverging', () => {
    const chineseControls = readRequiredFile('scale-continuous.controls.ts');
    const englishControls = readRequiredFile('scale-continuous.en.controls.ts');
    const demo = readRequiredFile('scale-continuous.demo.tsx');

    for (const controls of [chineseControls, englishControls]) {
      expect(controls).toContain("{ value: 'sequential'");
      expect(controls).toContain("{ value: 'diverging'");
      expect(controls).not.toContain("{ value: 'quantize'");
      expect(controls).not.toContain("{ value: 'threshold'");
      expect(controls).not.toContain("{ value: 'quantile'");
    }
    expect(demo).not.toContain("type: 'quantize'");
    expect(demo).not.toContain("type: 'threshold'");
    expect(demo).not.toContain("type: 'quantile'");
  });

  it('controls 说明使用 caption，并提供紧凑 API 查询入口', () => {
    for (const page of [chinesePage, englishPage]) {
      expect(page).not.toContain('<div className="text-sm text-muted-foreground">');
    }
    expect(chinesePage).toContain('## API 参考\n');
    expect(englishPage).toContain('## API Reference\n');
  });

  it('自动 color scale 的 SourceLink 指向真实派生分支', () => {
    for (const page of [chinesePage, englishPage]) {
      expect(page).toContain('startLine: 1657');
      expect(page).toContain('endLine: 1670');
      expect(page).not.toContain('startLine: 1671');
    }
  });
});
