import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { resolveDemoKey } from '../../src/modules/docs/components/component-preview/registry/contents';
import { demoModules } from './load-preview-registry';

const scalePositionRoot = resolve('src/modules/docs/contents/viz/plot/scale/position');
const scaleRoot = resolve(scalePositionRoot, '..');
const scaleChinesePage = readFileSync(resolve(scaleRoot, 'index.zh.mdx'), 'utf8');
const scaleEnglishPage = readFileSync(resolve(scaleRoot, 'index.en.mdx'), 'utf8');
const chinesePage = readFileSync(resolve(scalePositionRoot, 'index.zh.mdx'), 'utf8');
const englishPage = readFileSync(resolve(scalePositionRoot, 'index.en.mdx'), 'utf8');
const flowFigure = readFileSync(resolve(scalePositionRoot, 'scale-position-flow.tsx'), 'utf8');
const continuousControls = readFileSync(resolve(scalePositionRoot, 'scale-continuous.controls.ts'), 'utf8');
const englishContinuousControls = readFileSync(resolve(scalePositionRoot, 'scale-continuous.en.controls.ts'), 'utf8');
const scalePositionSegments = ['viz', 'plot', 'scale', 'position'];

const renderLocalizedFlow = (language: 'zh' | 'en'): { key: string; markup: string } => {
  const key = resolveDemoKey(scalePositionSegments, 'scale-position-flow', language);
  const Demo = demoModules[key]?.default;

  if (Demo === undefined) throw new Error(`Expected localized scale position flow demo for ${language}`);
  return { key, markup: renderToStaticMarkup(createElement(Demo)) };
};

describe('位置比例尺文档结构', () => {
  it('分组页说明非位置视觉通道与 PlotScale dimension 的边界', () => {
    for (const page of [scaleChinesePage, scaleEnglishPage]) {
      expect(page).toContain('size');
      expect(page).toContain('opacity');
      expect(page).toContain('shape');
      expect(page).toContain('/viz/plot/channel/builtin');
      expect(page).toContain('<PlotScale dimension>');
    }
  });

  it('双语页提供技术原理与 API 查询入口', () => {
    expect(chinesePage).toContain('## 技术原理\n');
    expect(englishPage).toContain('## How it works\n');
    expect(chinesePage).toContain('## API 参考\n');
    expect(englishPage).toContain('## API Reference\n');

    expect(chinesePage).not.toContain('首次阅读可跳过');
    expect(chinesePage).not.toContain('## React DSL 与 full spec');
    expect(chinesePage).not.toContain('## 实现依据');
    expect(englishPage).not.toContain('## React DSL and the full spec');
    expect(englishPage).not.toContain('## Implementation sources');
  });

  it('技术原理叙述图默认使用 xs 尺寸', () => {
    expect(chinesePage).toContain('<ComponentPreview files="scale-position-flow" size="xs" hideCode />');
    expect(englishPage).toContain('<ComponentPreview files="scale-position-flow" size="xs" hideCode />');
  });

  it('技术原理叙述图按页面语言呈现节点与关系', () => {
    const chineseFlow = renderLocalizedFlow('zh');
    const englishFlow = renderLocalizedFlow('en');

    expect(chineseFlow.key.endsWith('scale-position-flow.zh.demo.tsx')).toBe(true);
    expect(chineseFlow.markup).toContain('字段与图元');
    expect(chineseFlow.markup).toContain('派生');
    expect(chineseFlow.markup).not.toContain('field + mark');
    expect(englishFlow.key.endsWith('scale-position-flow.en.demo.tsx')).toBe(true);
    expect(englishFlow.markup).toContain('field + mark');
  });

  it('技术原理使用统一的有边框块状流程节点', () => {
    const nodeTags = flowFigure.match(/<Node[\s\S]*?>/g) ?? [];

    expect(flowFigure).toContain('<Layout width={360} height={120}');
    expect(nodeTags.length).toBeGreaterThan(0);
    for (const nodeTag of nodeTags) {
      expect(nodeTag).toContain('stroke="gray"');
      expect(nodeTag).toContain('fill="gray"');
      expect(nodeTag).toContain('fillOpacity={0.08}');
      expect(nodeTag).toContain('cornerRadius={4}');
    }
  });

  it('controls 说明使用 ComponentPreview caption', () => {
    expect(chinesePage).not.toContain('<div className="text-sm text-muted-foreground">');
    expect(englishPage).not.toContain('<div className="text-sm text-muted-foreground">');
    expect(chinesePage).toContain('caption="切换正值与跨零数据');
    expect(englishPage).toContain('caption="Switch between positive and zero-crossing data');
  });

  it('symlog playground 使用公开默认 constant 1', () => {
    for (const controls of [continuousControls, englishContinuousControls]) {
      expect(controls).toMatch(/id: 'constant'[\s\S]*?defaultValue: 1,/);
      expect(controls).not.toContain('constant: 10');
    }
  });

  it('time demo 提供双语只读数据面板与稳定 contract', () => {
    const timeControls = readFileSync(resolve(scalePositionRoot, 'scale-time.controls.ts'), 'utf8');
    const englishTimeControls = readFileSync(resolve(scalePositionRoot, 'scale-time.en.controls.ts'), 'utf8');
    const timeDemo = readFileSync(resolve(scalePositionRoot, 'scale-time.demo.tsx'), 'utf8');

    for (const controls of [timeControls, englishTimeControls]) {
      expect(controls).toContain("kind: 'table'");
      expect(controls).toContain('canonicalValues: {}');
      expect(controls).toContain("relatedApis: ['Plot.model']");
    }
    expect(timeDemo).toContain('defineControlledPreview');
    expect(timeDemo).toContain('export const previewControls');
    expect(timeDemo).toContain('export const previewSource');
  });
});
