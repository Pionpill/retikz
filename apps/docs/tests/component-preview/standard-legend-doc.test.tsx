import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { compileToScene } from '@retikz/core';
import { LegendArtifactSchema, LegendDefinition, LegendSchema } from '@retikz/standard/presentation';
import type { FC } from 'react';
import { describe, expect, it } from 'vitest';

import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import LegendBasicEnDemo from '@/modules/docs/contents/library/standard/presentation/legend/legend-basic.en.demo';
import LegendBasicZhDemo from '@/modules/docs/contents/library/standard/presentation/legend/legend-basic.zh.demo';
import {
  legendPlaygroundControls,
  previewControlContract as legendPlaygroundContract,
} from '@/modules/docs/contents/library/standard/presentation/legend/legend-playground.controls';
import {
  legendPlaygroundEnControls,
  previewControlContract as legendPlaygroundEnContract,
} from '@/modules/docs/contents/library/standard/presentation/legend/legend-playground.en.controls';
import { LegendPlaygroundPreview } from '@/modules/docs/contents/library/standard/presentation/legend/legend-playground.preview';
import LegendRampEnDemo from '@/modules/docs/contents/library/standard/presentation/legend/legend-ramp.en.demo';
import LegendRampZhDemo from '@/modules/docs/contents/library/standard/presentation/legend/legend-ramp.zh.demo';
import type { PreviewControlsDefinition } from '@/modules/docs/preview';

const legendRoot = resolve(process.cwd(), 'src/modules/docs/contents/library/standard/presentation/legend');

const readPage = (language: 'zh' | 'en'): string => readFileSync(resolve(legendRoot, `index.${language}.mdx`), 'utf8');

const headings = (source: string): Array<string> =>
  Array.from(source.matchAll(/^(#{2,6})\s+(.+)$/gm), match => `${match[1]} ${match[2]}`);

const readLegendFile = (name: string): string => readFileSync(resolve(legendRoot, name), 'utf8');

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
  const output = compileToScene(preview.ir, { composites: [LegendDefinition], padding: 0 });
  const viewBox = output.scene.layout;
  const envelope = output.artifacts.find(artifact => artifact.kind === 'composite');
  if (envelope === undefined) throw new Error('Expected a Legend compile artifact');

  const artifact = LegendArtifactSchema.parse(envelope.value);
  const bounds = artifact.container.allocationBounds;
  const legendCenter = bounds.x + bounds.width / 2;
  const viewBoxCenter = viewBox.x + viewBox.width / 2;

  return legendCenter - viewBoxCenter;
};

describe('Standard Legend 文档', () => {
  it('保持双语组件页面结构和公共 schema 锚点对齐', () => {
    const zh = readPage('zh');
    const en = readPage('en');

    expect(headings(zh).map(heading => heading.replace(/^## /, ''))).toHaveLength(headings(en).length);

    for (const source of [zh, en]) {
      for (const schema of ['LegendSchema', 'LegendArtifactSchema']) {
        expect(source).toMatch(new RegExp(`^#{3,4} ${schema}$`, 'm'));
        expect(source).toMatch(new RegExp(`<ZodSchema\\s+name="${schema}"\\s+expandNested`));
      }
    }
  });

  it('记录两种语言的所有编写条目和可执行预览源', () => {
    for (const source of [readPage('zh'), readPage('en')]) {
      for (const api of ['LegendInputEmbedAdapter', 'LegendDefinition', 'InputLegend', 'IRLegend']) {
        expect(source).toContain(api);
      }

      for (const component of ['Legend', 'LegendTitle', 'LegendItem', 'LegendRamp', 'LegendTick']) {
        expect(source).toContain(component);
      }

      for (const preview of ['legend-basic', 'legend-ramp', 'legend-playground', 'legend-pipeline']) {
        expect(source).toMatch(new RegExp(`files=(?:"${preview}"|\\{\\['${preview}')`));
      }
    }
  });

  it('记录两种语言中严格的标记和槽组成边界', () => {
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
  });

  it('使用特定于分支的字段公开双语标题和内容类型控件', () => {
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
      'Node.style.font',
      'Node.layout.align',
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

  it('渲染可编辑标题并在项目和方向感知渐变之间切换', () => {
    const canonical = legendPlaygroundContract.canonicalValues;

    expect(legendOf(canonical)).toMatchObject({
      contentAlign: 'center',
      titleGap: 8,
      title: {
        text: 'A–D',
        style: { font: { size: 16, weight: 'bold', style: 'normal' }, stroke: 'none', fill: 'none' },
        layout: { align: 'start', padding: 0 },
      },
      content: { kind: 'items' },
    });
    expect(legendOf(canonical).title).not.toHaveProperty('layout.minimumSize');
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
        layout: { align: 'end' },
        style: { font: { size: 22, weight: 'normal', style: 'italic' } },
      },
      titleGap: 20,
      contentAlign: 'end',
    });
    expect(legendOf({ ...canonical, contentAlign: 'start' })).toMatchObject({ contentAlign: 'start' });
    expect(legendOf({ ...canonical, kind: 'ramp', direction: 'horizontal' })).toMatchObject({
      content: { kind: 'ramp', sample: { layout: { minimumSize: { width: 160, height: 16 } } } },
    });
    expect(legendOf({ ...canonical, kind: 'ramp', direction: 'vertical' })).toMatchObject({
      content: { kind: 'ramp', sample: { layout: { minimumSize: { width: 16, height: 120 } } } },
    });
  });

  it('将每个 Legend 的分配区域居中放置在固定演示 viewBox 内', () => {
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

  it('通过渲染匹配的标记树来切换种类，并在标题子项上保留标题样式', () => {
    const source = readLegendFile('legend-playground.preview.tsx');

    expect(source).toMatch(
      /values\.kind === LegendContentKind\.Items[\s\S]*<Legend[\s\S]*kind=\{LegendContentKind\.Items\}/,
    );
    expect(source).toMatch(/<LegendItem[\s\S]*sample=\{/);
    expect(source).toMatch(/<Legend[\s\S]*kind=\{LegendContentKind\.Ramp\}/);
    expect(source).toContain('<LegendRamp>');
    expect(source).toContain('<LegendTick');
    expect(source).toMatch(/<LegendTitle>[\s\S]*<Node[\s\S]*style=\{[\s\S]*font:/);
    expect(source).not.toMatch(/<Legend[^>]+title=\{/);
  });

  it('区分两种语言中的标题文本对齐和 Legend 内容块对齐', () => {
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
