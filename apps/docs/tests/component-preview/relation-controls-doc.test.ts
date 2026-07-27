import type { FC } from 'react';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlsDefinition,
  PreviewPanelControlItem,
} from '../../src/modules/docs/components/component-preview';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import {
  previewControlContract as bubbleContract,
  relationBubbleControls,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-bubble.controls';
import BubbleDemo, {
  previewSource as bubbleSource,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-bubble.demo';
import {
  previewControlContract as englishBubbleContract,
  relationBubbleControls as englishRelationBubbleControls,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-bubble.en.controls';
import {
  previewControlContract as intervalContract,
  relationIntervalControls,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-interval.controls';
import IntervalDemo, {
  previewSource as intervalSource,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-interval.demo';
import {
  previewControlContract as englishIntervalContract,
  relationIntervalControls as englishRelationIntervalControls,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-interval.en.controls';
import {
  previewControlContract as pathExtremesContract,
  relationPathExtremesControls,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-path-extremes.controls';
import PathExtremesDemo, {
  previewSource as pathExtremesSource,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-path-extremes.demo';
import {
  previewControlContract as englishPathExtremesContract,
  relationPathExtremesControls as englishRelationPathExtremesControls,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-path-extremes.en.controls';
import {
  previewControlContract as sankeyContract,
  relationSankeyControls,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-sankey.controls';
import { previewSource as sankeySource } from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-sankey.demo';
import {
  previewControlContract as englishSankeyContract,
  relationSankeyControls as englishRelationSankeyControls,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-sankey.en.controls';
import {
  previewControlContract as scatterContract,
  relationScatterControls,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-scatter.controls';
import ScatterDemo, {
  previewSource as scatterSource,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-scatter.demo';
import {
  previewControlContract as englishScatterContract,
  relationScatterControls as englishRelationScatterControls,
} from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-scatter.en.controls';

/** 抹平可见文案后比较单个控件的双语运行时结构 */
const fieldContractOf = (field: PreviewPanelControlItem) =>
  field.kind === 'table'
    ? {
        id: field.id,
        kind: field.kind,
        rowCount: field.rows.length,
        columnKeys: field.columns?.map(column => column.key),
      }
    : {
        id: field.id,
        kind: field.kind,
        defaultValue: field.defaultValue,
        min: 'min' in field ? field.min : undefined,
        max: 'max' in field ? field.max : undefined,
        step: 'step' in field ? field.step : undefined,
        optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
        visibleWhen: field.visibleWhen,
      };

/** 抹平章节文案后比较面板分组与控件结构 */
const definitionContractOf = (definition: PreviewControlsDefinition) => {
  if (definition.presentation !== 'panel') throw new Error('Relation controls must use panel presentation');
  return definition.sections.map(section => ({
    defaultCollapsed: section.defaultCollapsed,
    visibleWhen: section.visibleWhen,
    fields: section.controls.map(fieldContractOf),
  }));
};

/** 返回面板中的所有控件 id */
const fieldIdsOf = (definition: PreviewControlsDefinition) => {
  if (definition.presentation !== 'panel') throw new Error('Relation controls must use panel presentation');
  return definition.sections.flatMap(section => section.controls.map(control => control.id));
};

/** 返回面板中的所有可写控件 */
const writableFieldsOf = (definition: PreviewControlsDefinition): Array<PreviewPanelControlItem> => {
  if (definition.presentation !== 'panel') throw new Error('Relation controls must use panel presentation');
  return definition.sections.flatMap(section => section.controls).filter(field => field.kind !== 'table');
};

/** 通过真实 controls context 渲染指定 Path 标签方位与倾斜状态 */
const renderScatterWithLabelSide = (labelSide: 'center' | 'top' | 'bottom', labelSloped = true) =>
  renderToStaticMarkup(
    createElement(
      PreviewControlStateContext.Provider,
      {
        value: {
          canonicalValues: scatterContract.canonicalValues,
          values: {
            ...scatterContract.canonicalValues,
            'relation-scatter-label-side': labelSide,
            'relation-scatter-label-sloped': labelSloped,
          },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        },
      },
      createElement(ScatterDemo),
    ),
  );

/** 通过真实 controls context 渲染指定气泡关系 Path 标签方位 */
const renderBubbleWithLabelSide = (labelSide: 'center' | 'top' | 'bottom') =>
  renderToStaticMarkup(
    createElement(
      PreviewControlStateContext.Provider,
      {
        value: {
          canonicalValues: bubbleContract.canonicalValues,
          values: {
            ...bubbleContract.canonicalValues,
            'relation-bubble-label-side': labelSide,
          },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        },
      },
      createElement(BubbleDemo),
    ),
  );

/** 通过真实 controls context 渲染指定路径极值 Path 标签方位 */
const renderPathExtremesWithLabelSide = (labelSide: 'center' | 'top' | 'bottom') =>
  renderToStaticMarkup(
    createElement(
      PreviewControlStateContext.Provider,
      {
        value: {
          canonicalValues: pathExtremesContract.canonicalValues,
          values: {
            ...pathExtremesContract.canonicalValues,
            'relation-path-label-side': labelSide,
          },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        },
      },
      createElement(PathExtremesDemo),
    ),
  );

/** 通过真实 controls context 渲染指定区间关系控件状态 */
const renderIntervalWithValues = (overrides: Readonly<Record<string, string | number | boolean>>) =>
  renderToStaticMarkup(
    createElement(
      PreviewControlStateContext.Provider,
      {
        value: {
          canonicalValues: intervalContract.canonicalValues,
          values: {
            ...intervalContract.canonicalValues,
            ...overrides,
          },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        },
      },
      createElement(IntervalDemo),
    ),
  );

const cases = [
  {
    name: '散点关系',
    controls: relationScatterControls,
    englishControls: englishRelationScatterControls,
    contract: scatterContract,
    englishContract: englishScatterContract,
    source: scatterSource,
    expectedIds: [
      'scatterRelations',
      'relation-scatter-routing',
      'relation-scatter-color',
      'relation-scatter-stroke-width',
      'relation-scatter-opacity',
      'relation-scatter-label-position',
      'relation-scatter-label-side',
      'relation-scatter-label-sloped',
      'relation-scatter-node-label-position',
    ],
  },
  {
    name: '气泡关系',
    controls: relationBubbleControls,
    englishControls: englishRelationBubbleControls,
    contract: bubbleContract,
    englishContract: englishBubbleContract,
    source: bubbleSource,
    expectedIds: [
      'bubbleNodes',
      'relation-bubble-color',
      'relation-bubble-stroke-width',
      'relation-bubble-label-position',
      'relation-bubble-label-side',
      'relation-bubble-label-sloped',
      'relation-bubble-node-label-position',
      'relation-bubble-node-opacity',
    ],
  },
  {
    name: '路径极值',
    controls: relationPathExtremesControls,
    englishControls: englishRelationPathExtremesControls,
    contract: pathExtremesContract,
    englishContract: englishPathExtremesContract,
    source: pathExtremesSource,
    expectedIds: [
      'pathExtremeRelations',
      'relation-path-anchor',
      'relation-path-bend-direction',
      'relation-path-bend-angle',
      'relation-path-color',
      'relation-path-stroke-width',
      'relation-path-label-position',
      'relation-path-label-side',
    ],
  },
  {
    name: '区间关系',
    controls: relationIntervalControls,
    englishControls: englishRelationIntervalControls,
    contract: intervalContract,
    englishContract: englishIntervalContract,
    source: intervalSource,
    expectedIds: [
      'intervalRelations',
      'relation-interval-offset',
      'relation-interval-stroke-width',
      'relation-interval-line-style',
      'relation-interval-label-position',
      'relation-interval-label-side',
      'relation-interval-label-sloped',
      'relation-interval-bar-label-position',
      'relation-interval-bar-label-color',
    ],
  },
  {
    name: '桑基关系',
    controls: relationSankeyControls,
    englishControls: englishRelationSankeyControls,
    contract: sankeyContract,
    englishContract: englishSankeyContract,
    source: sankeySource,
    expectedIds: [
      'sankeyRelations',
      'relation-sankey-samples',
      'relation-sankey-opacity',
      'relation-sankey-node-stroke-width',
      'relation-sankey-node-label-position',
      'relation-sankey-node-label-distance',
    ],
  },
] as const;

describe('关系图元文档 controls', () => {
  it('散点关系明确区分 Path 与 Node 标签', () => {
    expect(relationScatterControls.sections.map(section => section.label)).toEqual([
      '数据',
      '关系样式',
      'Path 标签',
      'Node 标签',
    ]);
    expect(englishRelationScatterControls.sections.map(section => section.label)).toEqual([
      'Data',
      'Relation style',
      'Path label',
      'Node label',
    ]);

    expect(relationScatterControls.sections[2].controls.map(control => control.label)).toEqual([
      'Path 上的位置',
      '相对 Path 方位',
      '沿 Path 倾斜',
    ]);
    expect(relationScatterControls.sections[3].controls.map(control => control.label)).toEqual(['Node 标签方位']);
    expect(englishRelationScatterControls.sections[2].controls.map(control => control.label)).toEqual([
      'Position on path',
      'Relative to path',
      'Follow path slope',
    ]);
    expect(englishRelationScatterControls.sections[3].controls.map(control => control.label)).toEqual([
      'Node label position',
    ]);

    expect(relationScatterControls.sections[2].controls[1]).toMatchObject({
      kind: 'select',
      id: 'relation-scatter-label-side',
      defaultValue: 'center',
      options: [
        { value: 'center', label: '居中（默认）' },
        { value: 'top', label: '上方' },
        { value: 'bottom', label: '下方' },
      ],
    });
    expect(englishRelationScatterControls.sections[2].controls[1]).toMatchObject({
      kind: 'select',
      id: 'relation-scatter-label-side',
      defaultValue: 'center',
      options: [
        { value: 'center', label: 'Centered (default)' },
        { value: 'top', label: 'Above' },
        { value: 'bottom', label: 'Below' },
      ],
    });
  });

  it('散点关系 canonical 状态可通过真实 Plot 渲染链路', () => {
    expect(() => renderToStaticMarkup(scatterSource.canonicalRender?.())).not.toThrow();
  });

  it('散点关系的居中、上方与下方会生成不同的 Path 标签位置', () => {
    const center = renderScatterWithLabelSide('center');
    const top = renderScatterWithLabelSide('top');
    const bottom = renderScatterWithLabelSide('bottom');

    expect(top).not.toBe(center);
    expect(bottom).not.toBe(center);
    expect(bottom).not.toBe(top);
  });

  it('散点关系关闭倾斜后仍保持居中标签与上方标签的区别', () => {
    const center = renderScatterWithLabelSide('center', false);
    const top = renderScatterWithLabelSide('top', false);

    expect(center).not.toBe(top);
  });

  it('气泡关系的居中、上方与下方会生成不同的 Path 标签位置', () => {
    const center = renderBubbleWithLabelSide('center');
    const top = renderBubbleWithLabelSide('top');
    const bottom = renderBubbleWithLabelSide('bottom');

    expect(top).not.toBe(center);
    expect(bottom).not.toBe(center);
    expect(bottom).not.toBe(top);
  });

  it('路径极值的居中、上方与下方会生成不同的 Path 标签位置', () => {
    const center = renderPathExtremesWithLabelSide('center');
    const top = renderPathExtremesWithLabelSide('top');
    const bottom = renderPathExtremesWithLabelSide('bottom');

    expect(top).not.toBe(center);
    expect(bottom).not.toBe(center);
    expect(bottom).not.toBe(top);
  });

  it('区间关系支持实线、虚线与点线，且实线不会写入 dashPattern', () => {
    const solid = renderIntervalWithValues({ 'relation-interval-line-style': 'solid' });
    const dashed = renderIntervalWithValues({ 'relation-interval-line-style': 'dashed' });
    const dotted = renderIntervalWithValues({ 'relation-interval-line-style': 'dotted' });

    expect(solid).not.toContain('stroke-dasharray');
    expect(dashed).toContain('stroke-dasharray="5 4"');
    expect(dotted).toContain('stroke-dasharray="1 4"');
    expect(dotted).toContain('stroke-linecap="round"');
  });

  it('区间关系标签默认位于路径上方，并支持居中与下方', () => {
    expect(intervalContract.canonicalValues['relation-interval-label-side']).toBe('top');

    const center = renderIntervalWithValues({ 'relation-interval-label-side': 'center' });
    const top = renderIntervalWithValues({ 'relation-interval-label-side': 'top' });
    const bottom = renderIntervalWithValues({ 'relation-interval-label-side': 'bottom' });

    expect(top).not.toBe(center);
    expect(bottom).not.toBe(center);
    expect(bottom).not.toBe(top);
  });

  it('区间标签支持居中与自定义颜色', () => {
    const intervalLabelPosition = relationIntervalControls.sections[3].controls[0];
    const markup = renderIntervalWithValues({
      'relation-interval-bar-label-position': 'center',
      'relation-interval-bar-label-color': '#7c3aed',
    });

    expect(intervalLabelPosition).toMatchObject({
      kind: 'select',
      options: expect.arrayContaining([{ value: 'center', label: '居中' }]),
    });
    expect(markup).toContain('#7c3aed');
  });

  it('区间关系的首个柱体贴合 y 轴', () => {
    const markup = renderIntervalWithValues({});
    const firstBar = markup.match(/<rect x="([\d.-]+)" y="[\d.-]+" width="[\d.-]+" height="[\d.-]+" fill="#1f77b4"/);
    const axisLines = [
      ...markup.matchAll(
        /<path d="M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)" fill="none" stroke="currentColor" stroke-width="1"><\/path>/g,
      ),
    ];
    const yAxis = axisLines.find(([, x1, , x2]) => x1 === x2);

    expect(firstBar).not.toBeNull();
    expect(yAxis).toBeDefined();
    expect(Number(firstBar?.[1])).toBeCloseTo(Number(yAxis?.[1]));
  });

  it('区间关系的柱底贴合 x 轴', () => {
    const markup = renderIntervalWithValues({});
    const firstBar = markup.match(/<rect x="[\d.-]+" y="([\d.-]+)" width="[\d.-]+" height="([\d.-]+)" fill="#1f77b4"/);
    const axisLines = [
      ...markup.matchAll(
        /<path d="M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)" fill="none" stroke="currentColor" stroke-width="1"><\/path>/g,
      ),
    ];
    const xAxis = axisLines.find(([, , y1, , y2]) => y1 === y2);

    expect(firstBar).not.toBeNull();
    expect(xAxis).toBeDefined();
    expect(Number(firstBar?.[1]) + Number(firstBar?.[2])).toBeCloseTo(Number(xAxis?.[2]));
  });

  it.each(cases)('$name 中英文 controls 结构一致并覆盖预期字段', testCase => {
    expect(fieldIdsOf(testCase.controls)).toEqual(testCase.expectedIds);
    expect(fieldIdsOf(testCase.englishControls)).toEqual(testCase.expectedIds);
    expect(definitionContractOf(testCase.englishControls)).toEqual(definitionContractOf(testCase.controls));
  });

  it.each(cases)('$name canonicalValues 覆盖所有可写字段并保持双语一致', testCase => {
    const writableFields = writableFieldsOf(testCase.controls);
    const canonicalValues: Readonly<Record<string, unknown>> = testCase.contract.canonicalValues;

    expect(Object.keys(canonicalValues).sort()).toEqual(writableFields.map(field => field.id).sort());
    expect(testCase.englishContract.canonicalValues).toEqual(testCase.contract.canonicalValues);
    for (const field of writableFields) {
      if (field.kind === 'table') continue;
      expect(canonicalValues[field.id]).toBe(field.defaultValue);
    }
  });

  it.each(cases)('$name canonicalRender 可派生预览 IR', testCase => {
    const CanonicalPreview: FC = () => testCase.source.canonicalRender?.();

    expect(() => buildPreviewIR(CanonicalPreview)).not.toThrow();
  });
});
