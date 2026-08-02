import { LegendSchema } from '@retikz/standard';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '@/modules/docs/preview';

import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import {
  legendPlaygroundControls,
  previewControlContract as legendPlaygroundContract,
} from '@/modules/docs/contents/standard/composite/legend/legend-playground.controls';
import { LegendPlaygroundPreview } from '@/modules/docs/contents/standard/composite/legend/legend-playground.demo';
import {
  legendPlaygroundEnControls,
  previewControlContract as legendPlaygroundEnContract,
} from '@/modules/docs/contents/standard/composite/legend/legend-playground.en.controls';

const legendRoot = resolve(process.cwd(), 'src/modules/docs/contents/standard/composite/legend');

const readPage = (language: 'zh' | 'en'): string => readFileSync(resolve(legendRoot, `index.${language}.mdx`), 'utf8');

const headings = (source: string): Array<string> =>
  Array.from(source.matchAll(/^(#{2,6})\s+(.+)$/gm), match => `${match[1]} ${match[2]}`);

const fieldContractOf = (definition: PreviewControlsDefinition) =>
  getPreviewControlFields(definition).map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
    visibleWhen: field.visibleWhen,
  }));

const legendOf = (values: Parameters<typeof LegendPlaygroundPreview>[0]) => {
  const Preview = () => LegendPlaygroundPreview(values);
  return LegendSchema.parse(buildPreviewIR(Preview).ir.children[0]);
};

describe('Standard Legend documentation', () => {
  it('keeps the bilingual component-page structure and public schema anchors aligned', () => {
    const zh = readPage('zh');
    const en = readPage('en');

    expect(headings(zh).map(heading => heading.replace(/^## /, ''))).toHaveLength(headings(en).length);
    expect(headings(zh).filter(heading => heading.startsWith('## '))).toEqual([
      '## 用法',
      '## 例子',
      '## 技术原理',
      '## API 参考',
      '## 相关',
    ]);
    expect(headings(en).filter(heading => heading.startsWith('## '))).toEqual([
      '## Usage',
      '## Examples',
      '## How it works',
      '## API Reference',
      '## Related',
    ]);
    for (const heading of ['### LegendSchema', '### LegendArtifactSchema']) {
      expect(zh).toContain(heading);
      expect(en).toContain(heading);
    }
  });

  it('consumes both schemas in deep mode and exposes all user paths and previews', () => {
    const zh = readPage('zh');
    const en = readPage('en');

    for (const source of [zh, en]) {
      expect(source).toMatch(/<ZodSchema\s+name="LegendSchema"\s+expandNested\s*\/>/);
      expect(source).toMatch(/<ZodSchema\s+name="LegendArtifactSchema"\s+expandNested\s*\/>/);
      for (const api of ['Legend', 'legend()', 'LegendVanillaAdapter', 'createLegend()', 'LegendModule']) {
        expect(source).toContain(api);
      }
      for (const preview of ['legend-basic', 'legend-ramp', 'legend-playground', 'legend-pipeline']) {
        expect(source).toContain(`files="${preview}"`);
      }
    }

    expect(zh).toMatch(
      /<details>[\s\S]*<summary>查看完整 LegendArtifactSchema 字段<\/summary>[\s\S]*<ZodSchema\s+name="LegendArtifactSchema"\s+expandNested\s*\/>[\s\S]*<\/details>/,
    );
    expect(en).toMatch(
      /<details>[\s\S]*<summary>View all LegendArtifactSchema fields<\/summary>[\s\S]*<ZodSchema\s+name="LegendArtifactSchema"\s+expandNested\s*\/>[\s\S]*<\/details>/,
    );
  });

  it('exposes bilingual title and content-kind controls with branch-specific fields', () => {
    const chineseFields = fieldContractOf(legendPlaygroundControls);
    const englishFields = fieldContractOf(legendPlaygroundEnControls);
    const itemsOnly = { controlId: 'kind', oneOf: ['items'] };

    expect(chineseFields).toEqual([
      { id: 'title', kind: 'text', defaultValue: 'A–D', optionValues: undefined, visibleWhen: undefined },
      {
        id: 'kind',
        kind: 'select',
        defaultValue: 'items',
        optionValues: ['items', 'ramp'],
        visibleWhen: undefined,
      },
      {
        id: 'titleFontSize',
        kind: 'range',
        defaultValue: 16,
        optionValues: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'titleFontWeight',
        kind: 'select',
        defaultValue: 'bold',
        optionValues: ['normal', 'bold'],
        visibleWhen: undefined,
      },
      {
        id: 'titleFontStyle',
        kind: 'select',
        defaultValue: 'normal',
        optionValues: ['normal', 'italic'],
        visibleWhen: undefined,
      },
      {
        id: 'titleAlign',
        kind: 'select',
        defaultValue: 'start',
        optionValues: ['start', 'middle', 'end'],
        visibleWhen: undefined,
      },
      {
        id: 'contentAlign',
        kind: 'select',
        defaultValue: 'start',
        optionValues: ['start', 'center', 'end'],
        visibleWhen: undefined,
      },
      {
        id: 'direction',
        kind: 'select',
        defaultValue: 'horizontal',
        optionValues: ['vertical', 'horizontal'],
        visibleWhen: undefined,
      },
      {
        id: 'wrap',
        kind: 'select',
        defaultValue: 'wrap',
        optionValues: ['nowrap', 'wrap'],
        visibleWhen: itemsOnly,
      },
      {
        id: 'sampleAlign',
        kind: 'select',
        defaultValue: 'center',
        optionValues: ['start', 'center', 'end'],
        visibleWhen: itemsOnly,
      },
      {
        id: 'titleGap',
        kind: 'range',
        defaultValue: 8,
        optionValues: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'columnGap',
        kind: 'range',
        defaultValue: 12,
        optionValues: undefined,
        visibleWhen: itemsOnly,
      },
      {
        id: 'rowGap',
        kind: 'range',
        defaultValue: 10,
        optionValues: undefined,
        visibleWhen: itemsOnly,
      },
      {
        id: 'sampleGap',
        kind: 'range',
        defaultValue: 8,
        optionValues: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'padding',
        kind: 'range',
        defaultValue: 12,
        optionValues: undefined,
        visibleWhen: undefined,
      },
      {
        id: 'overflow',
        kind: 'select',
        defaultValue: 'visible',
        optionValues: ['visible', 'clip'],
        visibleWhen: undefined,
      },
    ]);
    expect(englishFields).toEqual(chineseFields);
    expect(getPreviewControlFields(legendPlaygroundControls).find(field => field.id === 'titleFontSize')).toMatchObject(
      {
        kind: 'range',
        min: 12,
        max: 24,
        step: 1,
      },
    );
    expect(legendPlaygroundContract.canonicalValues).toEqual({
      title: 'A–D',
      kind: 'items',
      titleFontSize: 16,
      titleFontWeight: 'bold',
      titleFontStyle: 'normal',
      titleAlign: 'start',
      titleGap: 8,
      contentAlign: 'start',
      direction: 'horizontal',
      wrap: 'wrap',
      sampleAlign: 'center',
      columnGap: 12,
      rowGap: 10,
      sampleGap: 8,
      padding: 12,
      overflow: 'visible',
    });
    expect(legendPlaygroundEnContract.canonicalValues).toEqual(legendPlaygroundContract.canonicalValues);
    expect(legendPlaygroundEnContract.relatedApis).toEqual(legendPlaygroundContract.relatedApis);
    expect(legendPlaygroundContract.relatedApis).toEqual([
      'Legend.title',
      'Legend.titleGap',
      'Node.font',
      'Node.align',
      'Legend.contentAlign',
      'Legend.content.kind',
      'Legend.content.direction',
      'Legend.content.wrap',
      'Legend.content.sampleAlign',
      'Legend.content.columnGap',
      'Legend.content.rowGap',
      'Legend.content.sampleGap',
      'Legend.padding',
      'Legend.overflow',
    ]);
  });

  it('renders editable titles and switches between items and direction-aware ramps', () => {
    const canonical = legendPlaygroundContract.canonicalValues;

    expect(legendOf(canonical)).toMatchObject({
      contentAlign: 'start',
      titleGap: 8,
      title: {
        text: 'A–D',
        align: 'start',
        font: { size: 16, weight: 'bold', style: 'normal' },
        padding: 0,
        stroke: 'none',
        fill: 'none',
      },
      content: { kind: 'items' },
    });
    expect(legendOf(canonical).title).not.toHaveProperty('minimumSize');
    expect(legendOf({ ...canonical, title: '' })).not.toHaveProperty('title');
    expect(legendOf({ ...canonical, title: 'Scale' })).toMatchObject({ title: { text: 'Scale' } });
    expect(
      legendOf({
        ...canonical,
        padding: 24,
        titleFontSize: 22,
        titleFontWeight: 'normal',
        titleFontStyle: 'italic',
        titleAlign: 'end',
        titleGap: 20,
        contentAlign: 'end',
      }),
    ).toMatchObject({
      title: {
        align: 'end',
        font: { size: 22, weight: 'normal', style: 'italic' },
      },
      titleGap: 20,
      contentAlign: 'end',
    });
    expect(legendOf({ ...canonical, contentAlign: 'center' })).toMatchObject({ contentAlign: 'center' });
    expect(legendOf({ ...canonical, kind: 'ramp', direction: 'horizontal' })).toMatchObject({
      content: { kind: 'ramp', sample: { minimumSize: { width: 160, height: 16 } } },
    });
    expect(legendOf({ ...canonical, kind: 'ramp', direction: 'vertical' })).toMatchObject({
      content: { kind: 'ramp', sample: { minimumSize: { width: 16, height: 120 } } },
    });
  });

  it('distinguishes title text alignment from Legend content-block alignment in both languages', () => {
    const chineseFields = getPreviewControlFields(legendPlaygroundControls);
    const englishFields = getPreviewControlFields(legendPlaygroundEnControls);

    expect(chineseFields.find(field => field.id === 'title')).toMatchObject({ kind: 'text', multiline: true });
    expect(englishFields.find(field => field.id === 'title')).toMatchObject({ kind: 'text', multiline: true });
    expect(chineseFields.find(field => field.id === 'titleAlign')?.label).toBe('多行标题对齐');
    expect(englishFields.find(field => field.id === 'titleAlign')?.label).toBe('Multiline title alignment');
    expect(chineseFields.find(field => field.id === 'contentAlign')?.label).toBe('内容区域对齐');
    expect(englishFields.find(field => field.id === 'contentAlign')?.label).toBe('Content block alignment');
    expect(readPage('zh')).toContain('不是 Legend 在父容器中的位置');
    expect(readPage('en')).toContain('nor the Legend position in its parent container');
  });
});
