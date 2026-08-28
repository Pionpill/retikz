import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const scaleTimeRoot = resolve('src/modules/docs/contents/viz/plot/scale/position');
const demoSource = readFileSync(resolve(scaleTimeRoot, 'scale-time.demo.tsx'), 'utf8');
const dataSource = readFileSync(resolve(scaleTimeRoot, 'scale-time.data.ts'), 'utf8');
const chinesePage = readFileSync(resolve(scaleTimeRoot, 'index.zh.mdx'), 'utf8');
const englishPage = readFileSync(resolve(scaleTimeRoot, 'index.en.mdx'), 'utf8');

describe('时间位置比例尺文档示例', () => {
  it('只用 temporal model 展示自动派生的 time scale', () => {
    expect(demoSource).toContain("{ name: 'date', type: 'temporal' }");
    expect(demoSource).toContain('data={visits}');
    expect(demoSource).toContain('defineControlledPreview');
    expect(demoSource).toContain('export const previewControls');
    expect(demoSource).not.toContain('<PlotScale');
    expect(dataSource).toContain('export const visits');
    expect(dataSource).not.toContain('visitsByTimeSpan');
  });

  it('双语说明把示例限定为比例尺推导证据', () => {
    expect(chinesePage).toContain('横轴没有显式声明 PlotScale');
    expect(chinesePage).not.toContain('选择时间跨度');
    expect(englishPage).toContain('does not declare PlotScale explicitly');
    expect(englishPage).not.toContain('Choose a time span');
  });
});
