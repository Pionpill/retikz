import type { IRScene } from '@retikz/core';
import type { FC, ReactElement } from 'react';

import {
  compileToScene,
  fallbackMeasurer,
  resolveCoreProviderDependencies,
  resolveCoreThemeStyleColors,
  ThemeMode,
} from '@retikz/core';
import { createFlowDiagramProviderContribution, FlowDiagramSchema } from '@retikz/diagram/flow';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type { PreviewIR } from '../src/modules/docs/components/component-preview/utils';
import type { PreviewControlContract } from '../src/modules/docs/preview';

import { getPreviewControlFields } from '../src/modules/docs/components/component-preview/controls';
import { PreviewCoreThemeStyles, PreviewThemeStyle } from '../src/modules/docs/components/component-preview/theme';
import { buildPreviewIR, irToVanillaCode } from '../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../src/modules/docs/components/component-preview/vanilla-preview';
import IrCentricDemo from '../src/modules/docs/contents/kernel/introduction/ir-centric.zh.demo';
import {
  previewSource as FlowBasicEnPreviewSource,
  renderFlowBasicPreview as renderFlowBasicEnPreview,
} from '../src/modules/docs/contents/schematic/diagram/flow/basic/flow-basic.en.demo';
import {
  previewSource as FlowBasicPreviewSource,
  renderFlowBasicPreview,
} from '../src/modules/docs/contents/schematic/diagram/flow/basic/flow-basic.zh.demo';
import { previewControlContract as FlowCompoundControlContract } from '../src/modules/docs/contents/schematic/diagram/flow/basic/flow-compound.controls';
import { previewControlContract as FlowCompoundEnControlContract } from '../src/modules/docs/contents/schematic/diagram/flow/basic/flow-compound.en.controls';
import {
  previewSource as FlowCompoundEnPreviewSource,
  renderFlowCompoundPreview as renderFlowCompoundEnPreview,
} from '../src/modules/docs/contents/schematic/diagram/flow/basic/flow-compound.en.demo';
import {
  previewSource as FlowCompoundPreviewSource,
  renderFlowCompoundPreview,
} from '../src/modules/docs/contents/schematic/diagram/flow/basic/flow-compound.zh.demo';
import { previewControlContract as FlowThemeControlContract } from '../src/modules/docs/contents/schematic/diagram/flow/basic/flow-theme.controls';
import { previewControlContract as FlowThemeEnControlContract } from '../src/modules/docs/contents/schematic/diagram/flow/basic/flow-theme.en.controls';
import {
  previewSource as FlowThemeEnPreviewSource,
  renderFlowThemePreview as renderFlowThemeEnPreview,
} from '../src/modules/docs/contents/schematic/diagram/flow/basic/flow-theme.en.demo';
import {
  previewSource as FlowThemePreviewSource,
  renderFlowThemePreview,
} from '../src/modules/docs/contents/schematic/diagram/flow/basic/flow-theme.zh.demo';

const source = FlowDiagramSchema.parse({
  namespace: 'diagram',
  type: 'flow',
  entities: [
    { id: 'source', text: 'Source' },
    { id: 'target', text: 'Target' },
  ],
  groups: [],
  layouts: [],
  children: ['source', 'target'],
  relations: [{ source: 'source', target: 'target' }],
});

const scene: IRScene = { type: 'scene', version: 1, children: [source] };

const flowBasicContentRoot = resolve(process.cwd(), 'src/modules/docs/contents/schematic/diagram/flow/basic');
const flowBasicControlModules: Partial<Record<string, { previewControlContract: PreviewControlContract }>> =
  import.meta.glob<{ previewControlContract: PreviewControlContract }>(
    '../src/modules/docs/contents/schematic/diagram/flow/basic/*.controls.ts',
    { eager: true },
  );

const FlowBasicCanonicalDemo: FC = () => FlowBasicPreviewSource.canonicalRender?.() ?? null;
const FlowBasicEnCanonicalDemo: FC = () => FlowBasicEnPreviewSource.canonicalRender?.() ?? null;
const FlowCompoundCanonicalDemo: FC = () => FlowCompoundPreviewSource.canonicalRender?.() ?? null;
const FlowCompoundEnCanonicalDemo: FC = () => FlowCompoundEnPreviewSource.canonicalRender?.() ?? null;
const FlowThemeCanonicalDemo: FC = () => FlowThemePreviewSource.canonicalRender?.() ?? null;
const FlowThemeEnCanonicalDemo: FC = () => FlowThemeEnPreviewSource.canonicalRender?.() ?? null;

/** 读取 Flow Basic demo 的输出尺寸与取景配置 */
const flowBasicFrame = (Demo: FC) => {
  const root = Demo({});
  if (!isValidElement<{ viewBox?: IRScene['viewBox'] }>(root)) throw new Error('Missing Flow Basic root element');
  return root.props;
};

/** 编译 Flow 分组 demo 并读取最终场景包围盒 */
const flowCompoundBounds = (values: Parameters<typeof renderFlowCompoundPreview>[0]) => {
  const flowSource = FlowDiagramSchema.parse(
    buildPreviewIR(() => renderFlowCompoundPreview(values)).sourceIr.children[0],
  );
  const definitions = resolveCoreProviderDependencies({
    contributions: [createFlowDiagramProviderContribution()],
  });
  return compileToScene(
    { type: 'scene', version: 1, children: [flowSource] },
    { ...definitions, padding: 0, measureText: fallbackMeasurer },
  ).scene.layout;
};

/** 编译 Flow 全局配置 demo 并读取最终场景包围盒 */
const flowThemeBounds = (
  renderPreview: (values: Parameters<typeof renderFlowThemePreview>[0]) => ReactElement,
  values: Parameters<typeof renderFlowThemePreview>[0],
) => {
  const flowSource = FlowDiagramSchema.parse(buildPreviewIR(() => renderPreview(values)).sourceIr.children[0]);
  const definitions = resolveCoreProviderDependencies({
    contributions: [createFlowDiagramProviderContribution()],
  });
  return compileToScene(
    { type: 'scene', version: 1, children: [flowSource] },
    { ...definitions, padding: 0, measureText: fallbackMeasurer },
  ).scene.layout;
};

describe('Flow Diagram ComponentPreview', () => {
  it('keeps the highest-level Flow Source in executable Vanilla code', () => {
    const code = irToVanillaCode(scene);

    expect(code).toContain("flowDiagram('preview-flow-1'");
    expect(code).toContain('FlowDiagramInputEmbedAdapter');
    expect(code).toContain('PreviewThemeDefinitionBundle.flow');
    expect(code).toContain('entities:');
    expect(code).toContain('groups: []');
    expect(code).toContain('layouts: []');
    expect(code).toContain("children: ['source', 'target']");
    expect(code).not.toContain("type: 'entity'");
    expect(code).not.toContain('position:');
    expect(code).not.toContain("namespace: 'graph'");
  });

  it('renders the same Flow Source through the Vanilla preview path', () => {
    const preview: PreviewIR = {
      ir: scene,
      sourceIr: scene,
      contributions: [
        createFlowDiagramProviderContribution({
          flowThemeStyles: [],
        }),
      ],
      width: 420,
      height: 240,
    };
    const result = buildVanillaPreview(preview, {
      measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
    });

    expect(result.code).toContain("flowDiagram('preview-flow-1'");
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('Source');
    expect(result.svg).toContain('Target');
  });

  it('renders Graph-owned Vibrant Group and Entity appearance through the Flow preview bundle', () => {
    const themedSource = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'worker', text: 'Worker' },
        { id: 'api', text: 'API' },
      ],
      groups: [{ id: 'runtime', label: 'Runtime', children: ['worker'] }],
      layouts: [],
      children: ['runtime', 'api'],
    });
    const themedScene: IRScene = { type: 'scene', version: 1, children: [themedSource] };
    const preview: PreviewIR = {
      ir: themedScene,
      sourceIr: themedScene,
      contributions: [],
      width: 520,
      height: 280,
    };
    const mode = ThemeMode.Light;
    const core = PreviewCoreThemeStyles.find(definition => definition.name === PreviewThemeStyle.Vibrant);
    if (core === undefined) throw new Error('missing Vibrant Core definition');
    const colors = resolveCoreThemeStyleColors(mode, core.resolve({ mode }));
    const result = buildVanillaPreview(preview, {
      theme: { style: PreviewThemeStyle.Vibrant, mode },
      measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
    });

    expect(result.svg).toContain(colors.categorical[0]);
    expect(result.svg).toContain('Worker');
    expect(result.svg).toContain('API');
    expect(result.code).toContain('PreviewThemeDefinitionBundle.flow');
    expect(result.code).toContain('PreviewThemeDefinitionBundle.graph');
  });

  it.each([
    ['basic', FlowBasicCanonicalDemo],
    ['IR-centric', IrCentricDemo],
  ] as const)('derives the %s React demo as Flow Source without host props or geometry', (_name, Demo) => {
    const preview = buildPreviewIR(Demo);
    const serialized = JSON.stringify(preview.sourceIr);
    const vanilla = buildVanillaPreview(preview, {
      measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
    });

    expect(serialized).toContain('"namespace":"diagram","type":"flow"');
    expect(serialized).not.toContain('"position"');
    expect(serialized).not.toContain('"width":720');
    expect(serialized).not.toContain('"width":760');
    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.code).toContain('FlowDiagramInputEmbedAdapter');
  });

  it.each([
    ['zh', FlowBasicCanonicalDemo],
    ['en', FlowBasicEnCanonicalDemo],
  ] as const)('derives the %s basic demo with only Flow Entity elements and no inline Flow theme', (_lang, Demo) => {
    const preview = buildPreviewIR(Demo);
    const flow = FlowDiagramSchema.parse(preview.sourceIr.children[0]);

    expect(flow.entities).toHaveLength(4);
    expect(flow.groups).toEqual([]);
    expect(flow.layouts).toEqual([]);
    expect(flow.children).toEqual(flow.entities.map(entity => entity.id));
    expect(flow.flowTheme).toBeUndefined();
  });

  it('uses bilingual controls to change the frontend form role, status, rich text, block typography, and Relation status in real Flow Source', () => {
    const chinese =
      flowBasicControlModules['../src/modules/docs/contents/schematic/diagram/flow/basic/flow-basic.controls.ts']
        ?.previewControlContract;
    const english =
      flowBasicControlModules['../src/modules/docs/contents/schematic/diagram/flow/basic/flow-basic.en.controls.ts']
        ?.previewControlContract;

    expect(chinese).toBeDefined();
    expect(english).toBeDefined();
    if (chinese === undefined || english === undefined) return;

    expect(
      getPreviewControlFields(chinese.controls).map(field => ({
        kind: field.kind,
        id: field.id,
        defaultValue: field.defaultValue,
      })),
    ).toEqual([
      { kind: 'select', id: 'formRole', defaultValue: 'activity' },
      { kind: 'select', id: 'formStatus', defaultValue: 'none' },
      { kind: 'text', id: 'formText', defaultValue: '前端表单' },
      { kind: 'text', id: 'formSubtitle', defaultValue: '填写用户信息' },
      { kind: 'select', id: 'formSubtitleSize', defaultValue: 'sm' },
      { kind: 'color', id: 'formSubtitleColor', defaultValue: '#6b7280' },
      { kind: 'select', id: 'formTextAlign', defaultValue: 'middle' },
      { kind: 'range', id: 'formLineHeight', defaultValue: 18 },
      { kind: 'range', id: 'formMaxTextWidth', defaultValue: 160 },
      { kind: 'select', id: 'relationRole', defaultValue: 'flow' },
      { kind: 'select', id: 'relationStatus', defaultValue: 'none' },
    ]);
    expect(chinese.canonicalValues).toEqual({
      formRole: 'activity',
      formStatus: 'none',
      formText: '前端表单',
      formSubtitle: '填写用户信息',
      formSubtitleSize: 'sm',
      formSubtitleColor: '#6b7280',
      formTextAlign: 'middle',
      formLineHeight: 18,
      formMaxTextWidth: 160,
      relationRole: 'flow',
      relationStatus: 'none',
    });
    expect(english.canonicalValues).toEqual({
      formRole: 'activity',
      formStatus: 'none',
      formText: 'Frontend form',
      formSubtitle: 'Complete user details',
      formSubtitleSize: 'sm',
      formSubtitleColor: '#6b7280',
      formTextAlign: 'middle',
      formLineHeight: 18,
      formMaxTextWidth: 160,
      relationRole: 'flow',
      relationStatus: 'none',
    });
    expect(english.relatedApis).toEqual(chinese.relatedApis);
    expect(getPreviewControlFields(chinese.controls).find(field => field.id === 'formText')).toMatchObject({
      kind: 'text',
      multiline: true,
    });
    expect(getPreviewControlFields(english.controls).find(field => field.id === 'formText')).toMatchObject({
      kind: 'text',
      multiline: true,
    });
    expect(getPreviewControlFields(chinese.controls).find(field => field.id === 'formSubtitle')).toMatchObject({
      kind: 'text',
      multiline: false,
    });
    expect(
      getPreviewControlFields(chinese.controls).map(field => ({
        kind: field.kind,
        id: field.id,
        min: 'min' in field ? field.min : undefined,
        max: 'max' in field ? field.max : undefined,
        step: 'step' in field ? field.step : undefined,
        options: 'options' in field ? field.options.map(option => option.value) : undefined,
      })),
    ).toEqual(
      getPreviewControlFields(english.controls).map(field => ({
        kind: field.kind,
        id: field.id,
        min: 'min' in field ? field.min : undefined,
        max: 'max' in field ? field.max : undefined,
        step: 'step' in field ? field.step : undefined,
        options: 'options' in field ? field.options.map(option => option.value) : undefined,
      })),
    );
    expect(getPreviewControlFields(chinese.controls).map(field => field.label)).toEqual([
      '实体角色',
      '实体状态',
      '文本',
      '副标题',
      '副标题字号',
      '副标题颜色',
      '文本对齐',
      '行距',
      '最大文本宽度',
      '箭头类型',
      '关系状态',
    ]);
    expect(getPreviewControlFields(english.controls).map(field => field.label)).toEqual([
      'Entity role',
      'Entity status',
      'Text',
      'Subtitle',
      'Subtitle size',
      'Subtitle color',
      'Text alignment',
      'Line height',
      'Maximum text width',
      'Arrow type',
      'Relation status',
    ]);

    const values = {
      formRole: 'resource',
      formStatus: 'success',
      formText: '前端\n表单',
      formSubtitle: '补充说明',
      formSubtitleSize: 'lg',
      formSubtitleColor: 'darkorange',
      formTextAlign: 'start',
      formLineHeight: 24,
      formMaxTextWidth: 120,
      relationRole: 'dependency',
      relationStatus: 'warning',
    };
    const preview = buildPreviewIR(() => renderFlowBasicPreview(values));
    const flow = FlowDiagramSchema.parse(preview.sourceIr.children[0]);

    expect(flow.entities).toEqual([
      { id: 'user-input', text: '用户输入', role: 'participant' },
      {
        id: 'frontend-form',
        text: ['前端', '表单', { text: '补充说明', fill: 'darkorange', font: { size: 'lg' } }],
        role: 'resource',
        status: 'success',
        style: { align: 'start', lineHeight: 24, maxTextWidth: 120 },
      },
      { id: 'backend-validation', text: '后端服务', role: 'activity' },
      { id: 'database-input', text: '数据库输入', role: 'resource' },
    ]);
    expect(flow.groups).toEqual([]);
    expect(flow.children).toEqual(['user-input', 'frontend-form', 'backend-validation', 'database-input']);
    expect(flow.relations).toEqual([
      { source: 'user-input', target: 'frontend-form', role: 'dependency', status: 'warning' },
      { source: 'frontend-form', target: 'backend-validation', role: 'dependency', status: 'warning' },
      { source: 'backend-validation', target: 'database-input', role: 'dependency', status: 'warning' },
    ]);
    expect(
      buildVanillaPreview(preview, {
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      }).svg,
    ).toContain('darkorange');

    const withoutSubtitle = FlowDiagramSchema.parse(
      buildPreviewIR(() =>
        renderFlowBasicPreview({
          ...values,
          formText: '前端表单',
          formSubtitle: '   ',
          formStatus: 'none',
          relationRole: 'flow',
          relationStatus: 'none',
        }),
      ).sourceIr.children[0],
    );
    expect(withoutSubtitle.entities[1]).toMatchObject({ text: ['前端表单'] });
  });

  it('uses bilingual controls to apply global Entity and Relation styles through Flow theme', () => {
    const chinese = FlowThemeControlContract;
    const english = FlowThemeEnControlContract;

    const fieldsOf = (contract: PreviewControlContract) =>
      getPreviewControlFields(contract.controls).map(field => ({
        kind: field.kind,
        id: field.id,
        defaultValue: field.defaultValue,
        min: 'min' in field ? field.min : undefined,
        max: 'max' in field ? field.max : undefined,
        step: 'step' in field ? field.step : undefined,
      }));

    expect(fieldsOf(chinese)).toEqual([
      {
        kind: 'color',
        id: 'entityColor',
        defaultValue: '#334155',
        min: undefined,
        max: undefined,
        step: undefined,
      },
      { kind: 'range', id: 'entityFillOpacity', defaultValue: 1, min: 0.2, max: 1, step: 0.1 },
      { kind: 'range', id: 'entityStrokeWidth', defaultValue: 1, min: 1, max: 4, step: 0.5 },
      { kind: 'color', id: 'relationStroke', defaultValue: '#64748b', min: undefined, max: undefined, step: undefined },
      { kind: 'range', id: 'relationStrokeWidth', defaultValue: 1, min: 1, max: 4, step: 0.5 },
      { kind: 'range', id: 'relationStrokeOpacity', defaultValue: 0.9, min: 0.2, max: 1, step: 0.1 },
    ]);
    expect(fieldsOf(english)).toEqual(fieldsOf(chinese));
    expect(chinese.canonicalValues).toEqual({
      entityColor: '#334155',
      entityFillOpacity: 1,
      entityStrokeWidth: 1,
      relationStroke: '#64748b',
      relationStrokeWidth: 1,
      relationStrokeOpacity: 0.9,
    });
    expect(english.canonicalValues).toEqual(chinese.canonicalValues);

    for (const Demo of [FlowThemeCanonicalDemo, FlowThemeEnCanonicalDemo]) {
      const preview = buildPreviewIR(Demo);
      const flow = FlowDiagramSchema.parse(preview.sourceIr.children[0]);

      expect(flow.flowTheme).toEqual({
        entity: { style: { color: '#334155', fillOpacity: 1, strokeWidth: 1 } },
        relation: { style: { stroke: '#64748b', strokeWidth: 1, strokeOpacity: 0.9 } },
      });
      expect(flow.entities).toHaveLength(3);
      expect(flow.relations).toEqual([
        { source: 'draft', target: 'review' },
        { source: 'review', target: 'publish' },
      ]);
      expect(() =>
        buildVanillaPreview(preview, {
          measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
        }),
      ).not.toThrow();
    }
  });

  it('centers the global configuration demo in its fixed frame', () => {
    const values = {
      entityColor: '#334155',
      entityFillOpacity: 1,
      entityStrokeWidth: 1,
      relationStroke: '#64748b',
      relationStrokeWidth: 1,
      relationStrokeOpacity: 0.9,
    };

    for (const [Demo, renderPreview, expectedFrame] of [
      [
        FlowThemeCanonicalDemo,
        renderFlowThemePreview,
        { width: 420, height: 240, viewBox: { x: -71, y: -82.5, width: 420, height: 240 } },
      ],
      [
        FlowThemeEnCanonicalDemo,
        renderFlowThemeEnPreview,
        { width: 420, height: 240, viewBox: { x: -11.25, y: -64, width: 420, height: 240 } },
      ],
    ] as const) {
      expect(flowBasicFrame(Demo)).toMatchObject(expectedFrame);
      const bounds = flowThemeBounds(renderPreview, values);
      const viewBox = expectedFrame.viewBox;

      expect(Math.abs(viewBox.x + viewBox.width / 2 - (bounds.x + bounds.width / 2))).toBeLessThan(16);
      expect(Math.abs(viewBox.y + viewBox.height / 2 - (bounds.y + bounds.height / 2))).toBeLessThan(16);
      expect(bounds.x).toBeGreaterThan(viewBox.x);
      expect(bounds.x + bounds.width).toBeLessThan(viewBox.x + viewBox.width);
      expect(bounds.y).toBeGreaterThan(viewBox.y);
      expect(bounds.y + bounds.height).toBeLessThan(viewBox.y + viewBox.height);
    }
  });

  it('uses bilingual controls to change visible Group layout intent and shell-free Layout placement', () => {
    const chinese = FlowCompoundControlContract;
    const english = FlowCompoundEnControlContract;

    const fieldsOf = (contract: PreviewControlContract) =>
      getPreviewControlFields(contract.controls).map(field => ({
        kind: field.kind,
        id: field.id,
        defaultValue: field.defaultValue,
        min: 'min' in field ? field.min : undefined,
        max: 'max' in field ? field.max : undefined,
        step: 'step' in field ? field.step : undefined,
        options: 'options' in field ? field.options.map(option => option.value) : undefined,
      }));

    expect(fieldsOf(chinese)).toEqual([
      {
        kind: 'select',
        id: 'groupDirection',
        defaultValue: 'right',
        min: undefined,
        max: undefined,
        step: undefined,
        options: ['up', 'right', 'down', 'left'],
      },
      {
        kind: 'range',
        id: 'groupNodeGap',
        defaultValue: 20,
        min: 12,
        max: 32,
        step: 4,
        options: undefined,
      },
      {
        kind: 'range',
        id: 'groupRankGap',
        defaultValue: 36,
        min: 24,
        max: 48,
        step: 4,
        options: undefined,
      },
      {
        kind: 'select',
        id: 'layoutDirection',
        defaultValue: 'right',
        min: undefined,
        max: undefined,
        step: undefined,
        options: ['up', 'right', 'down', 'left'],
      },
      {
        kind: 'range',
        id: 'layoutGap',
        defaultValue: 24,
        min: 12,
        max: 32,
        step: 4,
        options: undefined,
      },
      {
        kind: 'select',
        id: 'layoutAlign',
        defaultValue: 'center',
        min: undefined,
        max: undefined,
        step: undefined,
        options: ['start', 'center', 'end'],
      },
    ]);
    expect(fieldsOf(english)).toEqual(fieldsOf(chinese));
    expect(chinese.canonicalValues).toEqual({
      groupDirection: 'right',
      groupNodeGap: 20,
      groupRankGap: 36,
      layoutDirection: 'right',
      layoutGap: 24,
      layoutAlign: 'center',
    });
    expect(english.canonicalValues).toEqual(chinese.canonicalValues);
    expect(english.relatedApis).toEqual(chinese.relatedApis);

    const values = {
      groupDirection: 'left',
      groupNodeGap: 32,
      groupRankGap: 48,
      layoutDirection: 'down',
      layoutGap: 28,
      layoutAlign: 'end',
    };
    const chineseFlow = FlowDiagramSchema.parse(
      buildPreviewIR(() => renderFlowCompoundPreview(values)).sourceIr.children[0],
    );
    const englishFlow = FlowDiagramSchema.parse(
      buildPreviewIR(() => renderFlowCompoundEnPreview(values)).sourceIr.children[0],
    );

    for (const flow of [chineseFlow, englishFlow]) {
      expect(flow.groups.find(group => group.id === 'service')).toMatchObject({
        layout: { direction: 'left', nodeGap: 32, rankGap: 48 },
      });
      expect(flow.layouts.find(layout => layout.id === 'storage')).toMatchObject({
        direction: 'down',
        gap: 28,
        align: 'end',
      });
    }
  });

  it.each([
    ['zh', renderFlowCompoundPreview],
    ['en', renderFlowCompoundEnPreview],
  ] as const)('keeps the %s grouping demo relations unlabeled', (_lang, renderPreview) => {
    const flow = FlowDiagramSchema.parse(
      buildPreviewIR(() =>
        renderPreview({
          groupDirection: 'right',
          groupNodeGap: 20,
          groupRankGap: 36,
          layoutDirection: 'right',
          layoutGap: 24,
          layoutAlign: 'center',
        }),
      ).sourceIr.children[0],
    );

    expect(flow.relations).toEqual([
      { source: 'request', target: 'validate' },
      { source: 'request', target: 'authorize' },
      { source: 'service', target: 'queue' },
      { source: 'queue', target: 'database' },
    ]);
  });

  it.each([
    ['zh', FlowCompoundCanonicalDemo],
    ['en', FlowCompoundEnCanonicalDemo],
  ] as const)('renders the controlled %s grouping demo at a fixed 1:1 frame', (_lang, Demo) => {
    expect(flowBasicFrame(Demo)).toMatchObject({
      width: 400,
      height: 460,
      viewBox: { x: -100, y: -86, width: 400, height: 460 },
    });
  });

  it('centers the fixed frame across the canonical and vertical-extreme grouping footprints', () => {
    const viewBox = flowBasicFrame(FlowCompoundCanonicalDemo).viewBox;
    if (viewBox === undefined) throw new Error('Missing Flow compound viewBox');
    const canonical = flowCompoundBounds({
      groupDirection: 'right',
      groupNodeGap: 20,
      groupRankGap: 36,
      layoutDirection: 'right',
      layoutGap: 24,
      layoutAlign: 'center',
    });
    const verticalExtreme = flowCompoundBounds({
      groupDirection: 'down',
      groupNodeGap: 32,
      groupRankGap: 48,
      layoutDirection: 'down',
      layoutGap: 32,
      layoutAlign: 'end',
    });
    const footprintCenter = {
      x: (canonical.x + canonical.width / 2 + verticalExtreme.x + verticalExtreme.width / 2) / 2,
      y: (canonical.y + canonical.height / 2 + verticalExtreme.y + verticalExtreme.height / 2) / 2,
    };

    expect(Math.abs(viewBox.x + viewBox.width / 2 - footprintCenter.x)).toBeLessThan(16);
    expect(Math.abs(viewBox.y + viewBox.height / 2 - footprintCenter.y)).toBeLessThan(16);
  });

  it.each(['flow-basic.zh.demo.tsx', 'flow-basic.en.demo.tsx'] as const)(
    'lets the controlled %s auto-fit horizontally in one 740 × 220 output',
    file => {
      const demo = readFileSync(resolve(flowBasicContentRoot, file), 'utf8');

      expect(demo).toContain('width={740}');
      expect(demo).toContain('height={220}');
      expect(demo).not.toContain('viewBox=');
      expect(demo).toContain("style={{ maxWidth: '100%', height: 'auto' }}");
      expect(demo).toContain('<FlowEntities');
      expect(demo).toContain('<FlowRelations');
    },
  );

  it.each([
    ['zh', FlowBasicCanonicalDemo],
    ['en', FlowBasicEnCanonicalDemo],
  ] as const)('uses natural horizontal bounds for the %s basic demo', (_lang, Demo) => {
    expect(flowBasicFrame(Demo).viewBox).toBeUndefined();
  });

  it.each([
    [
      'minimum geometry controls',
      () =>
        renderFlowBasicEnPreview({
          formRole: 'activity',
          formStatus: 'none',
          formText: 'Frontend form',
          formSubtitle: 'Complete user details',
          formSubtitleSize: 'xs',
          formSubtitleColor: '#6b7280',
          formTextAlign: 'start',
          formLineHeight: 14,
          formMaxTextWidth: 80,
          relationRole: 'flow',
          relationStatus: 'none',
        }),
    ],
    [
      'maximum geometry controls',
      () =>
        renderFlowBasicEnPreview({
          formRole: 'activity',
          formStatus: 'none',
          formText: 'Frontend form',
          formSubtitle: 'Complete user details',
          formSubtitleSize: 'lg',
          formSubtitleColor: '#6b7280',
          formTextAlign: 'end',
          formLineHeight: 32,
          formMaxTextWidth: 240,
          relationRole: 'flow',
          relationStatus: 'none',
        }),
    ],
  ] as const)('keeps natural horizontal bounds with %s', (_name, Demo) => {
    expect(flowBasicFrame(Demo).viewBox).toBeUndefined();
  });
});
