import type { FC } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlContract, PreviewControlValues } from '@/modules/docs/components/component-preview';

import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import { previewControlContract as activityZh } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-activity.controls';
import { previewControlContract as activityEn } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-activity.en.controls';
import { previewSource as activityEnSource } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-activity.en.demo';
import ActivityDemo, {
  previewSource as activityZhSource,
} from '@/modules/docs/contents/schematic/graph/entity/basic/entity-activity.zh.demo';
import { previewControlContract as conceptZh } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-concept.controls';
import { previewControlContract as conceptEn } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-concept.en.controls';
import { previewSource as conceptEnSource } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-concept.en.demo';
import ConceptDemo, {
  previewSource as conceptZhSource,
} from '@/modules/docs/contents/schematic/graph/entity/basic/entity-concept.zh.demo';
import { previewControlContract as eventZh } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-event.controls';
import { previewControlContract as eventEn } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-event.en.controls';
import { previewSource as eventEnSource } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-event.en.demo';
import EventDemo, {
  previewSource as eventZhSource,
} from '@/modules/docs/contents/schematic/graph/entity/basic/entity-event.zh.demo';
import { previewControlContract as gatewayZh } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-gateway.controls';
import { previewControlContract as gatewayEn } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-gateway.en.controls';
import { previewSource as gatewayEnSource } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-gateway.en.demo';
import GatewayDemo, {
  previewSource as gatewayZhSource,
} from '@/modules/docs/contents/schematic/graph/entity/basic/entity-gateway.zh.demo';
import { previewControlContract as participantZh } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-participant.controls';
import { previewControlContract as participantEn } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-participant.en.controls';
import { previewSource as participantEnSource } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-participant.en.demo';
import ParticipantDemo, {
  previewSource as participantZhSource,
} from '@/modules/docs/contents/schematic/graph/entity/basic/entity-participant.zh.demo';
import { previewControlContract as resourceZh } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-resource.controls';
import { previewControlContract as resourceEn } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-resource.en.controls';
import { previewSource as resourceEnSource } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-resource.en.demo';
import ResourceDemo, {
  previewSource as resourceZhSource,
} from '@/modules/docs/contents/schematic/graph/entity/basic/entity-resource.zh.demo';
import { previewControlContract as stateZh } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-state.controls';
import { previewControlContract as stateEn } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-state.en.controls';
import { previewSource as stateEnSource } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-state.en.demo';
import StateDemo, {
  previewSource as stateZhSource,
} from '@/modules/docs/contents/schematic/graph/entity/basic/entity-state.zh.demo';
import { previewControlContract as styleZh } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-style.controls';
import { previewControlContract as styleEn } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-style.en.controls';
import { previewSource as styleEnSource } from '@/modules/docs/contents/schematic/graph/entity/basic/entity-style.en.demo';
import StyleDemo, {
  previewSource as styleZhSource,
} from '@/modules/docs/contents/schematic/graph/entity/basic/entity-style.zh.demo';
import { previewControlContract as definitionZh } from '@/modules/docs/contents/schematic/graph/entity/extension/entity-definition.controls';
import { previewControlContract as definitionEn } from '@/modules/docs/contents/schematic/graph/entity/extension/entity-definition.en.controls';
import { previewSource as definitionEnSource } from '@/modules/docs/contents/schematic/graph/entity/extension/entity-definition.en.demo';
import EntityDefinitionDemo, {
  previewSource as definitionZhSource,
} from '@/modules/docs/contents/schematic/graph/entity/extension/entity-definition.zh.demo';

type PreviewSource = typeof participantZhSource;

type RoleScenario = Readonly<{
  role: string;
  content: string;
  chinese: PreviewControlContract;
  english: PreviewControlContract;
  chineseSource: PreviewSource;
  englishSource: PreviewSource;
  Demo: FC;
}>;

const scenarios: ReadonlyArray<RoleScenario> = [
  {
    role: 'participant',
    content: 'Payment API',
    chinese: participantZh,
    english: participantEn,
    chineseSource: participantZhSource,
    englishSource: participantEnSource,
    Demo: ParticipantDemo,
  },
  {
    role: 'activity',
    content: 'Process Order',
    chinese: activityZh,
    english: activityEn,
    chineseSource: activityZhSource,
    englishSource: activityEnSource,
    Demo: ActivityDemo,
  },
  {
    role: 'event',
    content: 'Timeout',
    chinese: eventZh,
    english: eventEn,
    chineseSource: eventZhSource,
    englishSource: eventEnSource,
    Demo: EventDemo,
  },
  {
    role: 'state',
    content: 'Pending',
    chinese: stateZh,
    english: stateEn,
    chineseSource: stateZhSource,
    englishSource: stateEnSource,
    Demo: StateDemo,
  },
  {
    role: 'gateway',
    content: 'Stock?',
    chinese: gatewayZh,
    english: gatewayEn,
    chineseSource: gatewayZhSource,
    englishSource: gatewayEnSource,
    Demo: GatewayDemo,
  },
  {
    role: 'resource',
    content: 'Order DB',
    chinese: resourceZh,
    english: resourceEn,
    chineseSource: resourceZhSource,
    englishSource: resourceEnSource,
    Demo: ResourceDemo,
  },
  {
    role: 'concept',
    content: 'Order',
    chinese: conceptZh,
    english: conceptEn,
    chineseSource: conceptZhSource,
    englishSource: conceptEnSource,
    Demo: ConceptDemo,
  },
];

const getCanonicalViewBox = (source: PreviewSource) =>
  buildPreviewIR(() => source.canonicalRender?.() ?? null).ir.viewBox;

const renderWithValues = (scenario: RoleScenario, values: Readonly<PreviewControlValues>): string =>
  renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues: scenario.chinese.canonicalValues,
        values,
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <scenario.Demo />
    </PreviewControlStateContext.Provider>,
  );

describe('Graph Entity role controls', () => {
  it('为七个 role 暴露双语一致的状态、精确颜色与文本控件', () => {
    for (const scenario of scenarios) {
      const fields = getPreviewControlFields(scenario.chinese.controls);

      expect(
        fields.map(field => ({ kind: field.kind, id: field.id, defaultValue: field.defaultValue })),
        scenario.role,
      ).toEqual([
        { kind: 'select', id: 'status', defaultValue: '' },
        { kind: 'color', id: 'color', defaultValue: 'currentColor' },
        { kind: 'text', id: 'content', defaultValue: scenario.content },
      ]);
      expect(scenario.chinese.canonicalValues, scenario.role).toEqual({
        status: '',
        color: 'currentColor',
        content: scenario.content,
      });
      expect(scenario.english.canonicalValues, scenario.role).toEqual(scenario.chinese.canonicalValues);
      expect(scenario.english.relatedApis, scenario.role).toEqual(scenario.chinese.relatedApis);
    }
  });

  it('让 canonical preview 使用主题默认填充，并让每个控件改变真实 SVG', () => {
    for (const scenario of scenarios) {
      const baseline = renderWithValues(scenario, scenario.chinese.canonicalValues);

      expect(baseline, scenario.role).toContain('<svg');
      expect(baseline, scenario.role).toMatch(/fill="(?!none")[^"]+"/u);
      if (scenario.role === 'activity') expect(baseline).not.toContain('stroke-dasharray');
      expect(
        renderWithValues(scenario, { ...scenario.chinese.canonicalValues, status: 'success' }),
        `${scenario.role}: status`,
      ).not.toBe(baseline);
      expect(
        renderWithValues(scenario, { ...scenario.chinese.canonicalValues, color: '#2563eb' }),
        `${scenario.role}: color`,
      ).not.toBe(baseline);
      expect(
        renderWithValues(scenario, { ...scenario.chinese.canonicalValues, content: `${scenario.content} · changed` }),
        `${scenario.role}: content`,
      ).not.toBe(baseline);
    }
  });

  it('固定完整坐标视口，让七个 role 按实际几何尺寸显示', () => {
    for (const scenario of scenarios) {
      expect(getCanonicalViewBox(scenario.chineseSource), `${scenario.role}: zh`).toEqual({
        x: 0,
        y: 0,
        width: 360,
        height: 180,
      });
      expect(getCanonicalViewBox(scenario.englishSource), `${scenario.role}: en`).toEqual({
        x: 0,
        y: 0,
        width: 360,
        height: 180,
      });
    }
  });

  it('默认 Scene IR 中的 Graph record 直接保存 Entity 字段，不写入 Theme', () => {
    for (const scenario of scenarios) {
      const source = buildPreviewIR(() => scenario.chineseSource.canonicalRender?.() ?? null).ir.children[0] as {
        theme?: unknown;
        children?: ReadonlyArray<unknown>;
      };

      expect(source, scenario.role).not.toHaveProperty('theme');
      expect(source.children, scenario.role).toEqual([
        {
          namespace: 'graph',
          type: 'entity',
          role: scenario.role,
          position: [180, 90],
          text: scenario.content,
        },
      ]);
    }
  });
});

describe('Graph Entity style playground', () => {
  const renderStyleWithValues = (values: Readonly<PreviewControlValues>): string =>
    renderToStaticMarkup(
      <PreviewControlStateContext.Provider
        value={{
          canonicalValues: styleZh.canonicalValues,
          values,
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        }}
      >
        <StyleDemo />
      </PreviewControlStateContext.Provider>,
    );

  it('暴露全部内置 role 与统一样式控件，并保持双语契约一致', () => {
    const fields = getPreviewControlFields(styleZh.controls);

    expect(fields.map(field => ({ kind: field.kind, id: field.id, defaultValue: field.defaultValue }))).toEqual([
      { kind: 'select', id: 'role', defaultValue: 'activity' },
      { kind: 'select', id: 'status', defaultValue: '' },
      { kind: 'text', id: 'content', defaultValue: 'Process Order' },
      { kind: 'color', id: 'fill', defaultValue: '#e2e8f0' },
      { kind: 'color', id: 'stroke', defaultValue: '#2563eb' },
      { kind: 'range', id: 'strokeWidth', defaultValue: 2 },
      { kind: 'switch', id: 'dashed', defaultValue: false },
      { kind: 'range', id: 'opacity', defaultValue: 1 },
      { kind: 'color', id: 'textColor', defaultValue: '#0f172a' },
    ]);
    expect(fields[0]?.kind === 'select' ? fields[0].options.map(option => option.value) : []).toEqual([
      'participant',
      'activity',
      'event',
      'state',
      'gateway',
      'resource',
      'concept',
    ]);
    expect(styleZh.canonicalValues).toEqual({
      role: 'activity',
      status: '',
      content: 'Process Order',
      fill: '#e2e8f0',
      stroke: '#2563eb',
      strokeWidth: 2,
      dashed: false,
      opacity: 1,
      textColor: '#0f172a',
    });
    expect(styleEn.canonicalValues).toEqual(styleZh.canonicalValues);
    expect(styleEn.relatedApis).toEqual(styleZh.relatedApis);
  });

  it('让 role 与每个显式样式控件都改变真实 SVG', () => {
    const baseline = renderStyleWithValues(styleZh.canonicalValues);

    expect(baseline).toContain('<svg');
    for (const role of ['participant', 'event', 'state', 'gateway', 'resource', 'concept']) {
      expect(renderStyleWithValues({ ...styleZh.canonicalValues, role }), `${role}: role`).not.toBe(baseline);
    }
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, content: 'Changed' }), 'content').not.toBe(baseline);
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, fill: '#dbeafe' }), 'fill').not.toBe(baseline);
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, stroke: '#dc2626' }), 'stroke').not.toBe(baseline);
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, strokeWidth: 4 }), 'strokeWidth').not.toBe(baseline);
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, dashed: true }), 'dashed').not.toBe(baseline);
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, opacity: 0.5 }), 'opacity').not.toBe(baseline);
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, textColor: '#ffffff' }), 'textColor').not.toBe(baseline);
  });

  it('固定完整坐标视口，并在 Source IR 中保留 authored Entity 样式字段', () => {
    expect(getCanonicalViewBox(styleZhSource)).toEqual({ x: 0, y: 0, width: 360, height: 180 });
    expect(getCanonicalViewBox(styleEnSource)).toEqual({ x: 0, y: 0, width: 360, height: 180 });

    const source = buildPreviewIR(() => styleZhSource.canonicalRender?.() ?? null).ir.children[0] as {
      children?: ReadonlyArray<unknown>;
    };
    expect(source.children).toEqual([
      {
        namespace: 'graph',
        type: 'entity',
        id: 'entity-style',
        role: 'activity',
        position: [180, 90],
        text: 'Process Order',
        fill: '#e2e8f0',
        stroke: '#2563eb',
        strokeWidth: 2,
        dashed: false,
        opacity: 1,
        textColor: '#0f172a',
      },
    ]);
  });
});

describe('Graph Entity predicate controls', () => {
  const renderDefinition = (values: Readonly<PreviewControlValues>): string =>
    renderToStaticMarkup(
      <PreviewControlStateContext.Provider
        value={{
          canonicalValues: definitionZh.canonicalValues,
          values,
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        }}
      >
        <EntityDefinitionDemo />
      </PreviewControlStateContext.Provider>,
    );

  it('公开 paramsSchema 对应的 status 与 critical 参数，并保持双语契约一致', () => {
    const fields = getPreviewControlFields(definitionZh.controls);

    expect(fields.map(field => ({ kind: field.kind, id: field.id, defaultValue: field.defaultValue }))).toEqual([
      { kind: 'select', id: 'status', defaultValue: 'available' },
      { kind: 'switch', id: 'critical', defaultValue: false },
      { kind: 'text', id: 'content', defaultValue: 'API Gateway' },
    ]);
    expect(definitionZh.canonicalValues).toEqual({
      status: 'available',
      critical: false,
      content: 'API Gateway',
    });
    expect(definitionEn.canonicalValues).toEqual(definitionZh.canonicalValues);
    expect(definitionEn.relatedApis).toEqual(definitionZh.relatedApis);
  });

  it('让 predicate params 与文本分别改变真实 SVG，并保留主题默认填充', () => {
    const baseline = renderDefinition(definitionZh.canonicalValues);

    expect(baseline).toContain('<svg');
    expect(baseline).toMatch(/fill="(?!none")[^"]+"/u);
    expect(renderDefinition({ ...definitionZh.canonicalValues, status: 'offline' })).not.toBe(baseline);
    expect(renderDefinition({ ...definitionZh.canonicalValues, critical: true })).not.toBe(baseline);
    expect(renderDefinition({ ...definitionZh.canonicalValues, content: 'Edge Gateway' })).not.toBe(baseline);
  });

  it('固定完整坐标视口，让 predicate demo 按实际几何尺寸显示', () => {
    expect(getCanonicalViewBox(definitionZhSource)).toEqual({ x: 0, y: 0, width: 420, height: 170 });
    expect(getCanonicalViewBox(definitionEnSource)).toEqual({ x: 0, y: 0, width: 420, height: 170 });
  });
});
