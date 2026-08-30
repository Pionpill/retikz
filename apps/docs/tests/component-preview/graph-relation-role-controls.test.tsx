import type { FC, ReactNode } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlContract, PreviewControlValues } from '@/modules/docs/components/component-preview';

import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';

import { defineRelationSemanticProps } from '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-role-controls';
import { previewControlContract as styleZh } from '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-style.controls';
import { previewControlContract as styleEn } from '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-style.en.controls';
import { previewSource as styleEnSource } from '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-style.en.demo';
import StyleDemo, {
  previewSource as styleZhSource,
} from '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-style.zh.demo';

type PreviewSource = Readonly<{
  canonicalRender?: () => ReactNode;
}>;

type ControlsModule = Readonly<{
  previewControlContract: PreviewControlContract;
}>;

type DemoModule = Readonly<{
  default: FC;
  previewSource: PreviewSource;
}>;

const controlsModules = import.meta.glob<ControlsModule>(
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-*.controls.ts',
  { eager: true },
);

const demoModules = import.meta.glob<DemoModule>(
  '../../src/modules/docs/contents/schematic/graph/relation/basic/relation-*.demo.tsx',
  { eager: true },
);

type RoleScenario = Readonly<{
  role: string;
  fields: ReadonlyArray<Readonly<{ kind: string; id: string; defaultValue: unknown }>>;
  kindOptions?: ReadonlyArray<string>;
  directionOptions?: ReadonlyArray<string>;
}>;

const scenarios: ReadonlyArray<RoleScenario> = [
  {
    role: 'association',
    fields: [
      { kind: 'select', id: 'kind', defaultValue: '' },
      { kind: 'select', id: 'direction', defaultValue: 'none' },
      { kind: 'color', id: 'color', defaultValue: 'currentColor' },
    ],
    kindOptions: ['', 'uml.aggregation', 'uml.composition'],
    directionOptions: ['none', 'forward', 'reverse', 'both'],
  },
  {
    role: 'dependency',
    fields: [
      { kind: 'select', id: 'kind', defaultValue: '' },
      { kind: 'color', id: 'color', defaultValue: 'currentColor' },
    ],
    kindOptions: ['', 'provenance.derivation'],
  },
  {
    role: 'generalization',
    fields: [
      { kind: 'select', id: 'kind', defaultValue: '' },
      { kind: 'color', id: 'color', defaultValue: 'currentColor' },
    ],
    kindOptions: ['', 'uml.realization'],
  },
  {
    role: 'flow',
    fields: [
      { kind: 'select', id: 'direction', defaultValue: 'forward' },
      { kind: 'color', id: 'color', defaultValue: 'currentColor' },
    ],
    directionOptions: ['forward', 'reverse', 'both'],
  },
  {
    role: 'influence',
    fields: [
      { kind: 'select', id: 'direction', defaultValue: 'forward' },
      { kind: 'color', id: 'color', defaultValue: 'currentColor' },
    ],
    directionOptions: ['forward', 'reverse', 'both'],
  },
];

const modulePath = (role: string, suffix: string): string =>
  `../../src/modules/docs/contents/schematic/graph/relation/basic/relation-${role}.${suffix}`;

const getScenarioModules = (role: string) => {
  const chineseControls = controlsModules[modulePath(role, 'controls.ts')];
  const englishControls = controlsModules[modulePath(role, 'en.controls.ts')];
  const chineseDemo = demoModules[modulePath(role, 'zh.demo.tsx')];
  const englishDemo = demoModules[modulePath(role, 'en.demo.tsx')];

  expect(chineseControls, `${role}: zh controls`).toBeDefined();
  expect(englishControls, `${role}: en controls`).toBeDefined();
  expect(chineseDemo, `${role}: zh demo`).toBeDefined();
  expect(englishDemo, `${role}: en demo`).toBeDefined();

  return {
    chineseControls,
    englishControls,
    chineseDemo,
    englishDemo,
  };
};

const renderWithValues = (contract: PreviewControlContract, Demo: FC, values: Readonly<PreviewControlValues>): string =>
  renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues: contract.canonicalValues,
        values,
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <Demo />
    </PreviewControlStateContext.Provider>,
  );

describe('Graph Relation role controls', () => {
  it('不会把未选择的 kind 或被 kind 接管的 direction 写成 undefined 字段', () => {
    expect(defineRelationSemanticProps(undefined, undefined)).toEqual({});
    expect(defineRelationSemanticProps('uml.aggregation', undefined)).toEqual({ kind: 'uml.aggregation' });
    expect(defineRelationSemanticProps(undefined, 'forward')).toEqual({ direction: 'forward' });
  });

  it('为五个 role 提供双语一致且只包含有效语义分支的 controls', () => {
    for (const scenario of scenarios) {
      const { chineseControls, englishControls } = getScenarioModules(scenario.role);
      const fields = getPreviewControlFields(chineseControls.previewControlContract.controls);

      expect(
        fields.map(field => ({ kind: field.kind, id: field.id, defaultValue: field.defaultValue })),
        scenario.role,
      ).toEqual(scenario.fields);
      expect(englishControls.previewControlContract.canonicalValues, scenario.role).toEqual(
        chineseControls.previewControlContract.canonicalValues,
      );
      expect(englishControls.previewControlContract.relatedApis, scenario.role).toEqual(
        chineseControls.previewControlContract.relatedApis,
      );

      const kind = fields.find(field => field.id === 'kind');
      if (scenario.kindOptions !== undefined && kind?.kind === 'select') {
        expect(
          kind.options.map(option => option.value),
          `${scenario.role}: kind`,
        ).toEqual(scenario.kindOptions);
      }

      const direction = fields.find(field => field.id === 'direction');
      if (scenario.directionOptions !== undefined && direction?.kind === 'select') {
        expect(
          direction.options.map(option => option.value),
          `${scenario.role}: direction`,
        ).toEqual(scenario.directionOptions);
      }
    }
  });

  it('让每个公开 control 改变真实 SVG，并保持固定 endpoint 构图', () => {
    for (const scenario of scenarios) {
      const { chineseControls, chineseDemo } = getScenarioModules(scenario.role);
      const contract = chineseControls.previewControlContract;
      const baseline = renderWithValues(contract, chineseDemo.default, contract.canonicalValues);

      expect(baseline, scenario.role).toContain('<svg');
      expect(
        renderWithValues(contract, chineseDemo.default, { ...contract.canonicalValues, color: '#2563eb' }),
        `${scenario.role}: color`,
      ).not.toBe(baseline);
      const changedKind = scenario.kindOptions?.find(value => value !== '');
      if (changedKind !== undefined) {
        expect(
          renderWithValues(contract, chineseDemo.default, { ...contract.canonicalValues, kind: changedKind }),
          `${scenario.role}: kind`,
        ).not.toBe(baseline);
      }

      const changedDirection = scenario.directionOptions?.find(value => value !== contract.canonicalValues.direction);
      if (changedDirection !== undefined) {
        expect(
          renderWithValues(contract, chineseDemo.default, {
            ...contract.canonicalValues,
            direction: changedDirection,
          }),
          `${scenario.role}: direction`,
        ).not.toBe(baseline);
      }
    }
  });

  it('固定完整坐标视口，让五个 role 按实际 marker 与路径尺寸显示', () => {
    for (const scenario of scenarios) {
      const { chineseDemo, englishDemo } = getScenarioModules(scenario.role);
      const getViewBox = (source: PreviewSource) => buildPreviewIR(() => source.canonicalRender?.() ?? null).ir.viewBox;

      expect(getViewBox(chineseDemo.previewSource), `${scenario.role}: zh`).toEqual({
        x: 0,
        y: 0,
        width: 420,
        height: 180,
      });
      expect(getViewBox(englishDemo.previewSource), `${scenario.role}: en`).toEqual({
        x: 0,
        y: 0,
        width: 420,
        height: 180,
      });
    }
  });
});

describe('Graph Relation style playground', () => {
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
      { kind: 'select', id: 'role', defaultValue: 'flow' },
      { kind: 'text', id: 'content', defaultValue: 'Next step' },
      { kind: 'color', id: 'stroke', defaultValue: '#2563eb' },
      { kind: 'range', id: 'strokeWidth', defaultValue: 2 },
      { kind: 'switch', id: 'dashed', defaultValue: false },
      { kind: 'range', id: 'opacity', defaultValue: 1 },
      { kind: 'color', id: 'labelTextColor', defaultValue: '#334155' },
      { kind: 'range', id: 'labelOpacity', defaultValue: 1 },
    ]);
    expect(fields[0]?.kind === 'select' ? fields[0].options.map(option => option.value) : []).toEqual([
      'association',
      'dependency',
      'generalization',
      'flow',
      'influence',
    ]);
    expect(styleZh.canonicalValues).toEqual({
      role: 'flow',
      content: 'Next step',
      stroke: '#2563eb',
      strokeWidth: 2,
      dashed: false,
      opacity: 1,
      labelTextColor: '#334155',
      labelOpacity: 1,
    });
    expect(styleEn.canonicalValues).toEqual(styleZh.canonicalValues);
    expect(styleEn.relatedApis).toEqual(styleZh.relatedApis);
  });

  it('让 role 与每个样式控件都改变真实 SVG', () => {
    const baseline = renderStyleWithValues(styleZh.canonicalValues);

    expect(baseline).toContain('<svg');
    for (const role of ['association', 'dependency', 'generalization', 'influence']) {
      expect(renderStyleWithValues({ ...styleZh.canonicalValues, role }), `${role}: role`).not.toBe(baseline);
    }
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, content: 'Changed' }), 'content').not.toBe(baseline);
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, stroke: '#dc2626' }), 'stroke').not.toBe(baseline);
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, strokeWidth: 4 }), 'strokeWidth').not.toBe(baseline);
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, dashed: true }), 'dashed').not.toBe(baseline);
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, opacity: 0.5 }), 'opacity').not.toBe(baseline);
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, labelTextColor: '#b91c1c' }), 'labelTextColor').not.toBe(
      baseline,
    );
    expect(renderStyleWithValues({ ...styleZh.canonicalValues, labelOpacity: 0.5 }), 'labelOpacity').not.toBe(baseline);
  });

  it('固定完整坐标视口，并在 Source IR 中保留 authored Relation 样式字段', () => {
    const getViewBox = (source: PreviewSource) => buildPreviewIR(() => source.canonicalRender?.() ?? null).ir.viewBox;

    expect(getViewBox(styleZhSource)).toEqual({ x: 0, y: 0, width: 460, height: 220 });
    expect(getViewBox(styleEnSource)).toEqual({ x: 0, y: 0, width: 460, height: 220 });

    const graph = buildPreviewIR(() => styleZhSource.canonicalRender?.() ?? null).ir.children[0] as {
      children?: ReadonlyArray<unknown>;
    };
    const relation = graph.children?.find(
      child =>
        typeof child === 'object' &&
        child !== null &&
        'type' in child &&
        (child as { type?: unknown }).type === 'relation',
    );

    expect(relation).toMatchObject({
      namespace: 'graph',
      type: 'relation',
      id: 'relation-style',
      role: 'flow',
      stroke: '#2563eb',
      strokeWidth: 2,
      opacity: 1,
      labelTextForeground: '#334155',
      labelOpacity: 1,
      labels: [{ text: 'Next step', position: 0.5 }],
    });
  });
});
