import type { FC } from 'react';

import { compileToScene } from '@retikz/core';
import { LegendArtifactSchema, LegendDefinition, LegendSchema } from '@retikz/standard';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '@/modules/docs/preview';

import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import LegendBasicEnDemo from '@/modules/docs/contents/library/standard/composite/legend/legend-basic.en.demo';
import LegendBasicZhDemo from '@/modules/docs/contents/library/standard/composite/legend/legend-basic.zh.demo';
import {
  legendPlaygroundControls,
  previewControlContract as legendPlaygroundContract,
} from '@/modules/docs/contents/library/standard/composite/legend/legend-playground.controls';
import { LegendPlaygroundPreview } from '@/modules/docs/contents/library/standard/composite/legend/legend-playground.demo';
import {
  legendPlaygroundEnControls,
  previewControlContract as legendPlaygroundEnContract,
} from '@/modules/docs/contents/library/standard/composite/legend/legend-playground.en.controls';
import LegendRampEnDemo from '@/modules/docs/contents/library/standard/composite/legend/legend-ramp.en.demo';
import LegendRampZhDemo from '@/modules/docs/contents/library/standard/composite/legend/legend-ramp.zh.demo';

const legendRoot = resolve(process.cwd(), 'src/modules/docs/contents/library/standard/composite/legend');
const changelogPath = resolve(process.cwd(), 'src/modules/docs/data/changelog/standard-0-1.ts');

const readPage = (language: 'zh' | 'en'): string => readFileSync(resolve(legendRoot, `index.${language}.mdx`), 'utf8');

const readLegendFile = (fileName: string): string => readFileSync(resolve(legendRoot, fileName), 'utf8');

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

const legendHorizontalCenterDelta = (Preview: FC): number => {
  const preview = buildPreviewIR(Preview);
  const viewBox = preview.ir.viewBox;
  if (viewBox === undefined) throw new Error('Expected a fixed Legend demo viewBox');
  const output = compileToScene(preview.ir, { composites: [LegendDefinition], padding: 0 });
  const envelope = output.artifacts.find(artifact => artifact.kind === 'composite');
  if (envelope === undefined) throw new Error('Expected a Legend compile artifact');
  const artifact = LegendArtifactSchema.parse(envelope.value);
  const bounds = artifact.container.allocationBounds;
  const legendCenter = bounds.x + bounds.width / 2;
  const viewBoxCenter = viewBox.x + viewBox.width / 2;
  return legendCenter - viewBoxCenter;
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
      for (const api of ['Legend', 'legend()', 'LegendInputEmbedAdapter', 'createLegend()', 'LegendDefinition']) {
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

  it('documents the five headless React exports and keeps Vanilla and IR plain-data authoring separate', () => {
    const zh = readPage('zh');
    const en = readPage('en');
    const changelog = readFileSync(changelogPath, 'utf8');

    for (const source of [zh, en]) {
      for (const component of ['Legend', 'LegendTitle', 'LegendItem', 'LegendRamp', 'LegendTick']) {
        expect(source).toContain(`### ${component}`);
      }
      expect(source).toMatch(/<Legend\s+kind=(?:"items"|\{LegendContentKind\.Items\})/);
      expect(source).toContain('<LegendTitle>');
      expect(source).toContain('<LegendItem');
      expect(source).toContain('Vanilla');
      expect(source).toContain('LegendInput');
      expect(source).not.toContain('React 接收 plain-data props');
      expect(source).not.toContain('React receives plain-data props');
      expect(source).not.toContain('不提供 `children` 模板入口');
      expect(source).not.toContain('does not expose a `children` template');
    }

    for (const fileName of [
      'legend-basic.zh.demo.tsx',
      'legend-basic.en.demo.tsx',
      'legend-ramp.zh.demo.tsx',
      'legend-ramp.en.demo.tsx',
      'legend-playground.demo.tsx',
    ]) {
      expect(readLegendFile(fileName)).not.toMatch(/\bcontent=\{/);
    }
    expect(readLegendFile('legend-basic.zh.demo.tsx')).toContain('<LegendItem');
    expect(readLegendFile('legend-ramp.zh.demo.tsx')).toContain('<LegendRamp>');
    expect(readLegendFile('legend-ramp.zh.demo.tsx')).toContain('<LegendTick');
    expect(readLegendFile('legend-playground.demo.tsx')).toContain('<LegendTitle>');
    expect(changelog).toContain('LegendTitle');
    expect(changelog).toContain('LegendItem');
    expect(changelog).toContain('LegendRamp');
    expect(changelog).toContain('LegendTick');
    expect(changelog).toMatch(/BREAKING/);
    expect(changelog).not.toContain('Legend plain-data props');
  });

  it('documents the strict marker and slot composition boundary in both languages', () => {
    const zh = readPage('zh');
    const en = readPage('en');

    expect(zh).toContain('### React 组合边界');
    expect(en).toContain('### React composition boundary');
    expect(zh).toContain('`LegendTitle` 0 或 1 个、`LegendItem` 0 个或多个');
    expect(en).toContain('zero or one `LegendTitle` and zero or more `LegendItem` markers');
    expect(zh).toContain('`LegendRamp` 必须且只能有 1 个');
    expect(en).toContain('exactly one `LegendRamp` is required');
    expect(zh).toContain('required slot');
    expect(en).toContain('required slot');
    expect(zh).toContain('optional label');
    expect(en).toContain('optional label');
    expect(zh).toMatch(/optional label[^\n]*恰好一个可转换的函数 element[^\n]*DOM \/ 对象型 wrapper/);
    expect(en).toMatch(/optional label[^\n]*exactly one convertible function element[^\n]*DOM \/ object wrappers/);
    expect(zh).toContain('[组合边界](#react-组合边界)');
    expect(en).toContain('[composition boundary](#react-composition-boundary)');
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
        defaultValue: 'center',
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
        id: 'gapColumn',
        kind: 'range',
        defaultValue: 12,
        optionValues: undefined,
        visibleWhen: itemsOnly,
      },
      {
        id: 'gapRow',
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
      contentAlign: 'center',
      direction: 'horizontal',
      wrap: 'wrap',
      sampleAlign: 'center',
      gapColumn: 12,
      gapRow: 10,
      sampleGap: 8,
      padding: 12,
      overflow: 'visible',
    });
    expect(legendPlaygroundEnContract.canonicalValues).toEqual(legendPlaygroundContract.canonicalValues);
    expect(legendPlaygroundEnContract.relatedApis).toEqual(legendPlaygroundContract.relatedApis);
    expect(legendPlaygroundContract.relatedApis).toEqual([
      'Legend.kind',
      'LegendTitle.children',
      'LegendItem.sample',
      'LegendItem.children',
      'LegendRamp.children',
      'LegendTick.offset',
      'LegendTick.children',
      'Legend.titleGap',
      'Node.font',
      'Node.align',
      'Legend.contentAlign',
      'Legend.direction',
      'Legend.wrap',
      'Legend.sampleAlign',
      'Legend.gap',
      'Legend.sampleGap',
      'Legend.padding',
      'Legend.overflow',
    ]);
  });

  it('renders editable titles and switches between items and direction-aware ramps', () => {
    const canonical = legendPlaygroundContract.canonicalValues;

    expect(legendOf(canonical)).toMatchObject({
      contentAlign: 'center',
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
    expect(legendOf({ ...canonical, contentAlign: 'start' })).toMatchObject({ contentAlign: 'start' });
    expect(legendOf({ ...canonical, kind: 'ramp', direction: 'horizontal' })).toMatchObject({
      content: { kind: 'ramp', sample: { minimumSize: { width: 160, height: 16 } } },
    });
    expect(legendOf({ ...canonical, kind: 'ramp', direction: 'vertical' })).toMatchObject({
      content: { kind: 'ramp', sample: { minimumSize: { width: 16, height: 120 } } },
    });
  });

  it('centers each Legend allocation inside its fixed demo viewBox', () => {
    const PlaygroundDemo: FC = () => LegendPlaygroundPreview(legendPlaygroundContract.canonicalValues);
    const deltas = [
      legendHorizontalCenterDelta(LegendBasicZhDemo),
      legendHorizontalCenterDelta(LegendBasicEnDemo),
      legendHorizontalCenterDelta(LegendRampZhDemo),
      legendHorizontalCenterDelta(LegendRampEnDemo),
      legendHorizontalCenterDelta(PlaygroundDemo),
    ];

    for (const delta of deltas) expect(delta).toBeCloseTo(0, 5);
  });

  it('switches kind by rendering the matching marker tree and keeps title styles on the title child', () => {
    const source = readLegendFile('legend-playground.demo.tsx');

    expect(source).toMatch(
      /values\.kind === LegendContentKind\.Items[\s\S]*<Legend[\s\S]*kind=\{LegendContentKind\.Items\}/,
    );
    expect(source).toMatch(/<LegendItem[\s\S]*sample=\{/);
    expect(source).toMatch(/<Legend[\s\S]*kind=\{LegendContentKind\.Ramp\}/);
    expect(source).toContain('<LegendRamp>');
    expect(source).toContain('<LegendTick');
    expect(source).toMatch(/<LegendTitle>[\s\S]*<Node[\s\S]*font=\{/);
    expect(source).not.toMatch(/<Legend[^>]+title=\{/);
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
