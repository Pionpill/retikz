import type { CompiledNodeLayout, IRScene, ScenePrimitive, TextMeasurer, TextPrim } from '@retikz/core';
import type { ReactNode } from 'react';

import { compileToScene, fallbackMeasurer } from '@retikz/core';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  AlignKey,
  ComponentPreviewCardProps,
  ComponentPreviewFiles,
  ComponentPreviewProps,
  ComponentRenderSource,
  DiffLineKind,
  PreviewActionSlot,
  PreviewControlContract,
  PreviewControlField,
  PreviewControlPlacement,
  PreviewControlPreset,
  PreviewControlRuntime,
  PreviewControlsDefinition,
  PreviewControlSlot,
  PreviewControlsOptions,
  PreviewControlValues,
  PreviewControlValuesFor,
  PreviewControlVisibility,
  PreviewPanelControlItem,
  PreviewSourceConfig,
  RendererMode,
  SizeKey,
} from '../../src/modules/docs/components/component-preview';

import * as componentPreviewExports from '../../src/modules/docs/components/component-preview';
import { ToolbarIconButton } from '../../src/modules/docs/components/component-preview/components';
import { ToolbarIconButton as DirectToolbarIconButton } from '../../src/modules/docs/components/component-preview/components/ToolbarIconButton';
import {
  getPreviewControlFields,
  resolveVisiblePreviewControlSections,
} from '../../src/modules/docs/components/component-preview/controls';
import {
  buildControlsKey,
  buildKey,
  buildLangControlsKey,
  buildSourceFileKey,
  controlModules,
  demoModules,
  demoSources,
  localSourceFiles,
  resolveControlsKey,
  resolveDemoKey,
  resolvePreviewControlContract,
  resolvePreviewControls,
} from '../../src/modules/docs/components/component-preview/registry';
import {
  buildPreviewIR,
  buildReactSourceFiles,
  formatIR,
  irToVanillaCode,
} from '../../src/modules/docs/components/component-preview/utils';
import { nodeGeometryFrame } from '../../src/modules/docs/contents/kernel/components/node/overview/node-geometry.controls';
import { nodeTextRows } from '../../src/modules/docs/contents/viz/plot/channel/builtin/builtin-node-text.data';

const privateExportKeys = [
  'ComponentPreviewDialog',
  'PreviewPanel',
  'SourcePanel',
  'usePreviewPanelState',
  'useSourcePanelState',
  'buildPreviewToolSlots',
  'usePreviewControlRuntime',
  'buildPreviewSource',
  ['Component', 'Render'].join(''),
  ['Component', 'Detail', 'Dialog'].join(''),
];

/** 抹平文案后比较单个 controls 字段的运行时结构契约 */
const controlFieldContractOf = (field: PreviewPanelControlItem) =>
  field.kind === 'table'
    ? {
        id: field.id,
        kind: field.kind,
        rowCount: field.rows.length,
        columnKeys: field.columns?.map(column => column.key),
        visibleWhen: field.visibleWhen,
      }
    : {
        id: field.id,
        kind: field.kind,
        defaultValue: field.defaultValue,
        min: 'min' in field ? field.min : undefined,
        max: 'max' in field ? field.max : undefined,
        step: 'step' in field ? field.step : undefined,
        playDuration: field.kind === 'range' ? field.playDuration : undefined,
        multiline: field.kind === 'text' ? field.multiline : undefined,
        optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
        visibleWhen: field.visibleWhen,
      };

/** 抹平文案与 slot 渲染函数后比较 controls 的运行时结构契约 */
const controlDefinitionContractOf = (definition: PreviewControlsDefinition) => {
  const slots = definition.slots?.map(slot => ({
    id: slot.id,
    placement: slot.placement,
    visibility: slot.visibility,
  }));

  return definition.presentation === 'panel'
    ? {
        presentation: definition.presentation,
        slots,
        sections: definition.sections.map(section => ({
          defaultCollapsed: section.defaultCollapsed,
          visibleWhen: section.visibleWhen,
          fields: section.controls.map(controlFieldContractOf),
        })),
      }
    : {
        presentation: definition.presentation,
        slots,
        fields: definition.controls.map(field => ({
          ...controlFieldContractOf(field),
          placement: field.placement,
          visibility: field.visibility,
        })),
      };
};

type NodeGeometryValues = {
  paddingX: number;
  paddingY: number;
  margin: number;
  minimumWidth: number;
  minimumHeight: number;
  cornerRadius: number;
  scale: number;
  rotate: number;
};

/** 通过 Core 的真实布局链路编译几何 playground 可调节点 */
const compileGeometryNode = (
  values: NodeGeometryValues,
  measureText: TextMeasurer = fallbackMeasurer,
): { layout: CompiledNodeLayout; bounds: ReturnType<typeof compileToScene>['layout'] } => {
  let layout: CompiledNodeLayout | undefined;
  const scene = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'node',
          id: 'Q',
          position: [...nodeGeometryFrame.subjectPosition],
          text: 'q',
          padding: { x: values.paddingX, y: values.paddingY },
          margin: values.margin,
          minimumSize: { width: values.minimumWidth, height: values.minimumHeight },
          cornerRadius: values.cornerRadius,
          scale: values.scale,
          rotate: values.rotate,
        },
      ],
    } satisfies IRScene,
    {
      measureText,
      onNodeLayout: nextLayout => {
        layout = nextLayout;
      },
      padding: 0,
      precision: 6,
    },
  );
  if (!layout) throw new Error('Missing compiled Node geometry layout');
  return { layout, bounds: scene.layout };
};

/** 递归查找节点正文 Text primitive */
const findTextPrimitive = (primitives: ReadonlyArray<ScenePrimitive>): TextPrim | undefined => {
  for (const primitive of primitives) {
    if (primitive.type === 'text') return primitive;
    if (primitive.type === 'group') {
      const nested = findTextPrimitive(primitive.children);
      if (nested) return nested;
    }
  }
  return undefined;
};

/** 用 Core 真实文本布局链路编译内置通道 playground 的文字 */
const compileBuiltinText = (
  text: string,
  values: { align: 'start' | 'middle' | 'end'; fontSize: number; lineHeight: number; maxTextWidth: number },
): { layout: CompiledNodeLayout; text: TextPrim } => {
  let layout: CompiledNodeLayout | undefined;
  const scene = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'node',
          position: [0, 0],
          text,
          align: values.align,
          font: { size: values.fontSize, weight: 'bold' },
          lineHeight: values.lineHeight,
          maxTextWidth: values.maxTextWidth,
        },
      ],
    } satisfies IRScene,
    {
      onNodeLayout: nextLayout => {
        layout = nextLayout;
      },
      padding: 0,
    },
  );
  const textPrimitive = findTextPrimitive(scene.primitives);
  if (!layout || !textPrimitive) throw new Error('Missing compiled builtin text layout');
  return { layout, text: textPrimitive };
};

describe('preview controls registry', () => {
  it('锁定 ComponentPreview 完整公开 props', () => {
    expectTypeOf<ComponentPreviewProps>().toEqualTypeOf<{
      files: ComponentPreviewFiles;
      controls?: PreviewControlsOptions;
      dialogActions?: Array<PreviewActionSlot>;
      align?: AlignKey;
      size?: SizeKey;
      previewClassName?: string;
      hideCode?: boolean;
      caption?: ReactNode;
    }>();
  });

  it('从 registry owner 暴露本地化 controls key resolver', () => {
    expect(resolveControlsKey).toBeTypeOf('function');
  });

  it('ComponentPreview 使用已解析语言选择本地化 controls', () => {
    const source = readFileSync(resolve('src/modules/docs/components/component-preview/ComponentPreview.tsx'), 'utf8');

    expect(source).toContain("const lang = (i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en';");
  });

  it('registry helper 不通过组件预览根 barrel 转发', () => {
    expect(buildControlsKey).toBeTypeOf('function');
    expect(controlModules).toBeTypeOf('object');
    expect(resolvePreviewControlContract).toBeTypeOf('function');
    expect(resolvePreviewControls).toBeTypeOf('function');
    expect(componentPreviewExports).not.toHaveProperty('resolveControlsKey');
    expect(componentPreviewExports).not.toHaveProperty('buildControlsKey');
    expect(componentPreviewExports).not.toHaveProperty('controlModules');
    expect(componentPreviewExports).not.toHaveProperty('resolvePreviewControls');
    expect(componentPreviewExports).not.toHaveProperty('demoModules');
    expect(componentPreviewExports).not.toHaveProperty('buildAnimationControlSlots');
    expect(componentPreviewExports).not.toHaveProperty('buildConfiguredControlSlots');
    expect(componentPreviewExports).not.toHaveProperty('buildPreviewToolSlots');
    expect(componentPreviewExports).not.toHaveProperty('ANIMATION_PAUSED_CONTROL_ID');
    expect(componentPreviewExports).not.toHaveProperty('buildAnimationSlots');
    expect(componentPreviewExports).not.toHaveProperty('ANIM_PAUSE_ID');
  });

  it('根 owner 只暴露真实跨 owner 消费所需的稳定入口', () => {
    expect(componentPreviewExports.ComponentPreview).toBeTypeOf('function');
    expect(componentPreviewExports.ComponentPreviewCard).toBeTypeOf('function');
    expect(buildPreviewIR).toBeTypeOf('function');
    expect(buildReactSourceFiles).toBeTypeOf('function');
    expect(formatIR).toBeTypeOf('function');
    expect(irToVanillaCode).toBeTypeOf('function');

    const typeSurface = {} as {
      preview: ComponentPreviewProps;
      card: ComponentPreviewCardProps;
      source: ComponentRenderSource;
      diff: DiffLineKind;
      field: PreviewControlField;
      definition: PreviewControlsDefinition;
      values: PreviewControlValuesFor<PreviewControlsDefinition>;
      contract: PreviewControlContract;
      preset: PreviewControlPreset;
      controlPlacement: PreviewControlPlacement;
      controlRuntime: PreviewControlRuntime;
      controlSlot: PreviewControlSlot;
      controls: PreviewControlsOptions;
      controlVisibility: PreviewControlVisibility;
      actionSlot: PreviewActionSlot;
      rendererMode: RendererMode;
      align: AlignKey;
      size: SizeKey;
      sourceConfig: PreviewSourceConfig;
    };
    expect(typeSurface).toBeTypeOf('object');

    expect(Object.keys(componentPreviewExports).sort()).toEqual([
      'ComponentPreview',
      'ComponentPreviewCard',
      'definePreviewControls',
      'formatIR',
      'usePreviewControls',
    ]);

    for (const key of privateExportKeys) {
      expect(componentPreviewExports).not.toHaveProperty(key);
    }
  });

  it('保留 components 中立组件 owner', () => {
    expect(ToolbarIconButton).toBeTypeOf('function');
    expect(ToolbarIconButton).toBe(DirectToolbarIconButton);
  });

  it('uses .controls.ts keys', () => {
    expect(buildControlsKey(['viz', 'plot', 'mark', 'path'], 'line-curve')).toBe(
      '../../contents/viz/plot/mark/path/line-curve.controls.ts',
    );
    expect(buildControlsKey(['viz', 'plot', 'mark', 'path'], 'line-closure')).toBe(
      '../../contents/viz/plot/mark/path/line-closure.controls.ts',
    );
    expect(buildControlsKey(['viz', 'plot', 'mark', 'path'], 'line-stack-area')).toBe(
      '../../contents/viz/plot/mark/path/line-stack-area.controls.ts',
    );
  });

  it('通过同一 registry owner 暴露 contents key helper', () => {
    expect(buildSourceFileKey(['kernel', 'components'], 'demo.data.ts')).toBe(
      '../../contents/kernel/components/demo.data.ts',
    );
    expect(resolveDemoKey(['kernel', 'components', 'test'], '__missing__', 'zh')).toBe(
      '../../contents/kernel/components/test/__missing__.demo.tsx',
    );
  });

  it('从真实 demo 模块收集源码派生配置', () => {
    const key = resolveDemoKey(['viz', 'plot', 'mark', 'path'], 'line-curve', 'zh');

    expect(demoModules[key]?.previewSource).toMatchObject({ deriveIR: false });
    expect(demoModules[key]?.previewSource?.canonicalRender).toEqual(expect.any(Function));
  });

  it('contents 统一从短作者入口导入 ComponentPreview author API', () => {
    const legacyPath = '@/modules/docs/components/component-preview/author';
    const legacySources = [...Object.values(demoSources), ...Object.values(localSourceFiles)].filter(source =>
      source?.includes(legacyPath),
    );

    expect(legacySources).toEqual([]);
  });

  it('Scope transform demo 使用坐标轴而非原点和轴端节点', () => {
    const source = demoSources[buildKey(['kernel', 'components', 'layout', 'scope'], 'scope-translate-basic')];

    expect(source).toContain('id="Q"');
    expect(source).not.toMatch(/<Node id="[ABCPXY]"/);
    expect(source?.match(/arrow="->"/g)).toHaveLength(2);
    expect(source?.match(/dashPattern=\{\[1, 4\]\}/g)).toHaveLength(5);
    expect(source?.match(/lineCap="round"/g)).toHaveLength(5);
    expect(source).not.toContain('dashPattern={[4, 3]}');
  });

  it('Layout 与 Scope 的几何辅助边界使用 dotted', () => {
    const overviewSegments = ['kernel', 'components', 'layout', 'overview'];
    const scopeSegments = ['kernel', 'components', 'layout', 'scope'];
    const viewBoxSource = demoSources[buildKey(overviewSegments, 'layout-viewbox')];
    const scopeReferenceSource = demoSources[buildKey(scopeSegments, 'scope-id-reference')];

    for (const source of [viewBoxSource, scopeReferenceSource]) {
      expect(source).toContain('dashPattern={[1, 4]}');
      expect(source).toContain('lineCap="round"');
      expect(source).not.toContain('dashPattern={[4, 3]}');
    }
  });

  it('优先解析语言化 controls，并在缺失时回退通用文件', () => {
    const segments = ['viz', 'plot', 'mark', 'path'];
    const englishKey = buildLangControlsKey(segments, 'line-curve', 'en');

    expect(Object.keys(controlModules).filter(key => key.includes('line-curve'))).toContain(englishKey);
    expect(resolveControlsKey(segments, 'line-curve', 'en')).toBe(englishKey);
    expect(resolveControlsKey(segments, 'line-curve', 'fr')).toBe(buildControlsKey(segments, 'line-curve'));

    const controls = resolvePreviewControls(controlModules[englishKey]);
    expect(controls).toMatchObject({
      presentation: 'overlay',
      controls: [
        {
          kind: 'select',
          id: 'path-curve',
          label: 'Connection',
          options: expect.arrayContaining([
            { value: 'linear', label: 'Linear' },
            { value: 'step', label: 'Step' },
          ]),
        },
      ],
    });
  });

  it('resolves named *Controls exports only', () => {
    const controls = componentPreviewExports.definePreviewControls({
      presentation: 'overlay',
      controls: [{ kind: 'text', id: 'size', label: 'Size', defaultValue: '6' }],
    });

    expect(resolvePreviewControls({ lineCurveControls: controls })).toBe(controls);
    expect(resolvePreviewControls({ lineCurveActions: controls })).toBeUndefined();
  });

  it('归一显式 controls contract，并保留 canonical state、presets 与 API 归属', () => {
    const controls = componentPreviewExports.definePreviewControls({
      presentation: 'overlay',
      controls: [{ kind: 'text', id: 'size', label: 'Size', defaultValue: '6' }],
    });
    const contract = {
      controls,
      canonicalValues: { size: '6' },
      presets: [{ id: 'large', label: 'Large', values: { size: '12' } }],
      relatedApis: ['Node.fontSize'],
    } satisfies PreviewControlContract;

    expect(resolvePreviewControlContract({ previewControlContract: contract })).toBe(contract);
    expect(resolvePreviewControls({ previewControlContract: contract })).toBe(controls);
  });

  it('拒绝 contract 中不存在的 canonical control id', () => {
    expect(() =>
      resolvePreviewControlContract({
        previewControlContract: {
          controls: componentPreviewExports.definePreviewControls({
            presentation: 'overlay',
            controls: [{ kind: 'text', id: 'size', label: 'Size', defaultValue: '6' }],
          }),
          canonicalValues: { missing: '6' },
          relatedApis: ['Node.fontSize'],
        },
      }),
    ).toThrow('Unknown preview control id in canonicalValues: "missing".');
  });

  it('仅收集 canonical controls，不要求复用方提供转发模块', () => {
    const segments = ['viz', 'plot', 'mark', 'path'];

    expect(resolvePreviewControls(controlModules[buildControlsKey(segments, 'line-curve')])).toBeDefined();
    expect(controlModules[buildControlsKey(segments, 'line-closure')]).toBeUndefined();
    expect(controlModules[buildLangControlsKey(segments, 'line-closure', 'en')]).toBeUndefined();
    expect(controlModules[buildControlsKey(segments, 'line-stack-area')]).toBeUndefined();
    expect(controlModules[buildLangControlsKey(segments, 'line-stack-area', 'en')]).toBeUndefined();
  });

  it('Node playground 的中英文 panel definition 保持运行时契约一致', () => {
    const segments = ['kernel', 'components', 'node', 'overview'];
    const zhDefinition = resolvePreviewControls(controlModules[buildControlsKey(segments, 'node-styled')]);
    const enDefinition = resolvePreviewControls(controlModules[buildLangControlsKey(segments, 'node-styled', 'en')]);
    expect(zhDefinition?.presentation).toBe('panel');
    expect(enDefinition?.presentation).toBe('panel');

    const contractOf = (definition: typeof zhDefinition) =>
      definition?.presentation === 'panel'
        ? getPreviewControlFields(definition).map(field => ({
            id: field.id,
            kind: field.kind,
            defaultValue: field.defaultValue,
            optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
          }))
        : [];

    expect(contractOf(zhDefinition)).toEqual(contractOf(enDefinition));
    expect(contractOf(zhDefinition).map(field => field.id)).toEqual([
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'fill',
      'stroke',
      'strokeWidth',
      'dashed',
      'opacity',
    ]);
  });

  it('Node 分组新增 controls 的中英文运行时契约保持一致', () => {
    const cases = [
      {
        segments: ['kernel', 'components', 'node', 'overview'],
        name: 'node-geometry',
        presentation: 'panel',
      },
      {
        segments: ['kernel', 'components', 'node', 'overview'],
        name: 'node-shape-connection',
        presentation: 'panel',
      },
      {
        segments: ['kernel', 'components', 'node', 'overview'],
        name: 'node-text',
        presentation: 'panel',
      },
      {
        segments: ['kernel', 'components', 'node', 'overview'],
        name: 'node-label',
        presentation: 'panel',
      },
      {
        segments: ['kernel', 'components', 'node', 'overview'],
        name: 'node-z-index',
        presentation: 'panel',
      },
      {
        segments: ['kernel', 'components', 'node', 'coordinate'],
        name: 'coordinate-as-anchor',
        presentation: 'panel',
      },
      {
        segments: ['kernel', 'components', 'node', 'coordinate'],
        name: 'coordinate-fold-junction',
        presentation: 'panel',
      },
      {
        segments: ['kernel', 'components', 'node', 'coordinate'],
        name: 'coordinate-between',
        presentation: 'panel',
      },
      {
        segments: ['kernel', 'components', 'node', 'coordinate'],
        name: 'coordinate-offset-chain',
        presentation: 'panel',
      },
      {
        segments: ['kernel', 'components', 'node', 'text'],
        name: 'text-attrs',
        presentation: 'panel',
      },
    ] as const;

    const contractOf = (definition: PreviewControlsDefinition) => {
      const fields = getPreviewControlFields(definition).map(field => ({
        field,
        sectionVisibleWhen:
          definition.presentation === 'panel'
            ? definition.sections.find(section => section.controls.some(item => item.id === field.id))?.visibleWhen
            : undefined,
      }));

      return fields.map(({ field, sectionVisibleWhen }) => ({
        id: field.id,
        kind: field.kind,
        defaultValue: field.defaultValue,
        min: field.kind === 'range' ? field.min : undefined,
        max: field.kind === 'range' ? field.max : undefined,
        step: field.kind === 'range' ? field.step : undefined,
        multiline: field.kind === 'text' ? field.multiline : undefined,
        visibleWhen: field.visibleWhen,
        sectionVisibleWhen,
        optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
      }));
    };

    for (const item of cases) {
      const zhDefinition = resolvePreviewControls(controlModules[buildControlsKey([...item.segments], item.name)]);
      const enDefinition = resolvePreviewControls(
        controlModules[buildLangControlsKey([...item.segments], item.name, 'en')],
      );

      expect(zhDefinition?.presentation, `${item.name} zh`).toBe(item.presentation);
      expect(enDefinition?.presentation, `${item.name} en`).toBe(item.presentation);
      if (!zhDefinition || !enDefinition) throw new Error(`Missing controls definition: ${item.name}`);
      expect(contractOf(zhDefinition)).toEqual(contractOf(enDefinition));
    }
  });

  it('Node 栈序 playground 用面板分别控制 a、b、c 的 zIndex', () => {
    const segments = ['kernel', 'components', 'node', 'overview'];
    const zhDefinition = resolvePreviewControls(controlModules[buildControlsKey(segments, 'node-z-index')]);
    const enDefinition = resolvePreviewControls(controlModules[buildLangControlsKey(segments, 'node-z-index', 'en')]);
    const expected = [
      { id: 'zIndexA', label: 'a zIndex', defaultValue: 2, min: -2, max: 4, step: 1 },
      { id: 'zIndexB', label: 'b zIndex', defaultValue: 0, min: -2, max: 4, step: 1 },
      { id: 'zIndexC', label: 'c zIndex', defaultValue: 0, min: -2, max: 4, step: 1 },
    ];
    const contractOf = (definition: PreviewControlsDefinition | undefined) => {
      if (!definition || definition.presentation !== 'panel') return [];
      return getPreviewControlFields(definition).map(field => ({
        id: field.id,
        label: field.label,
        defaultValue: field.defaultValue,
        min: field.kind === 'range' ? field.min : undefined,
        max: field.kind === 'range' ? field.max : undefined,
        step: field.kind === 'range' ? field.step : undefined,
      }));
    };

    expect(contractOf(zhDefinition)).toEqual(expected);
    expect(contractOf(enDefinition)).toEqual(expected);
  });

  it('Coordinate 用法 demo 用中英文面板控制各自的定位参数', () => {
    const segments = ['kernel', 'components', 'node', 'coordinate'];
    const cases = [
      {
        name: 'coordinate-as-anchor',
        expected: [
          { id: 'positionX', defaultValue: 0, min: -30, max: 30, step: 10 },
          { id: 'positionY', defaultValue: 0, min: -20, max: 20, step: 10 },
          { id: 'horizontalDistance', defaultValue: 110, min: 80, max: 130, step: 10 },
          { id: 'verticalDistance', defaultValue: 65, min: 50, max: 80, step: 5 },
        ],
      },
      {
        name: 'coordinate-fold-junction',
        expected: [
          { id: 'junctionX', defaultValue: 0, min: -40, max: 40, step: 10 },
          { id: 'junctionY', defaultValue: 0, min: -40, max: 40, step: 10 },
        ],
      },
      {
        name: 'coordinate-offset-chain',
        expected: [
          { id: 'rootX', defaultValue: -140, min: -170, max: -90, step: 10 },
          { id: 'rootY', defaultValue: 0, min: -40, max: 40, step: 10 },
          { id: 'stepX', defaultValue: 120, min: 80, max: 140, step: 10 },
        ],
      },
      {
        name: 'coordinate-between',
        expected: [{ id: 'fraction', defaultValue: 0.5, min: 0, max: 1, step: 0.05 }],
      },
    ] as const;
    const contractOf = (definition: PreviewControlsDefinition | undefined) => {
      if (!definition || definition.presentation !== 'panel') return [];
      return getPreviewControlFields(definition).map(field => ({
        id: field.id,
        defaultValue: field.defaultValue,
        min: field.kind === 'range' ? field.min : undefined,
        max: field.kind === 'range' ? field.max : undefined,
        step: field.kind === 'range' ? field.step : undefined,
      }));
    };

    for (const item of cases) {
      const zhDefinition = resolvePreviewControls(controlModules[buildControlsKey(segments, item.name)]);
      const enDefinition = resolvePreviewControls(controlModules[buildLangControlsKey(segments, item.name, 'en')]);

      expect(contractOf(zhDefinition), `${item.name} zh`).toEqual(item.expected);
      expect(contractOf(enDefinition), `${item.name} en`).toEqual(item.expected);
    }
  });

  it('Coordinate 定位 playground 使用固定 viewBox，避免相机跟随可调主体', () => {
    const segments = ['kernel', 'components', 'node', 'coordinate'];
    const cases = [
      { name: 'coordinate-as-anchor', frame: 'coordinateAsAnchorFrame', languages: ['zh', 'en'] },
      { name: 'coordinate-fold-junction', frame: 'coordinateFoldJunctionFrame', languages: ['zh', 'en'] },
      { name: 'coordinate-offset-chain', frame: 'coordinateOffsetChainFrame', languages: ['zh', 'en'] },
      { name: 'coordinate-between', frame: 'coordinateBetweenFrame', languages: ['zh'] },
    ] as const;

    for (const item of cases) {
      for (const language of item.languages) {
        const source = demoSources[resolveDemoKey(segments, item.name, language)];

        expect(source, `${item.name} ${language}`).toContain(`viewBox={${item.frame}.viewBox}`);
      }
    }
  });

  it('Coordinate 偏移链用固定世界坐标轴显出根 position 变化', () => {
    const segments = ['kernel', 'components', 'node', 'coordinate'];

    for (const language of ['zh', 'en'] as const) {
      const source = demoSources[resolveDemoKey(segments, 'coordinate-offset-chain', language)];

      expect(source, language).toContain('way={coordinateOffsetChainFrame.xAxis}');
      expect(source, language).toContain('way={coordinateOffsetChainFrame.yAxis}');
      expect(source?.match(/dashPattern=\{\[1, 4\]\}/g), language).toHaveLength(2);
      expect(source?.match(/lineCap="round"/g), language).toHaveLength(2);
    }
  });

  it('Coordinate 虚拟锚点用固定世界坐标轴显出 hub position 变化', () => {
    const segments = ['kernel', 'components', 'node', 'coordinate'];

    for (const language of ['zh', 'en'] as const) {
      const source = demoSources[resolveDemoKey(segments, 'coordinate-as-anchor', language)];

      expect(source, language).toContain('way={coordinateAsAnchorFrame.xAxis}');
      expect(source, language).toContain('way={coordinateAsAnchorFrame.yAxis}');
      expect(source?.match(/dashPattern=\{\[1, 4\]\}/g), language).toHaveLength(2);
      expect(source?.match(/lineCap="round"/g), language).toHaveLength(2);
    }
  });

  it('Node 后半段用文本与标签 playground 替代重复 demo', () => {
    const segments = ['kernel', 'components', 'node', 'overview'];

    expect(demoSources[resolveDemoKey(segments, 'node-text', 'zh')]).toBeDefined();
    expect(demoSources[resolveDemoKey(segments, 'node-text', 'en')]).toBeDefined();
    expect(demoSources[resolveDemoKey(segments, 'node-label', 'zh')]).toBeDefined();
    expect(demoSources[resolveDemoKey(segments, 'node-label', 'en')]).toBeDefined();

    for (const name of [
      'node-label-basic',
      'node-multiline',
      'node-max-text-width',
      'node-styled-lines',
      'node-multiline-shapes',
      'node-label-distance',
      'node-label-inside',
      'node-label-rotate',
      'node-pin',
    ]) {
      expect(demoSources[resolveDemoKey(segments, name, 'zh')], `${name} zh`).toBeUndefined();
      expect(demoSources[resolveDemoKey(segments, name, 'en')], `${name} en`).toBeUndefined();
    }
  });

  it('Node 形状连接 controls 锁定双节点的 shape、boundary、fit、gap 与 anchor', () => {
    const segments = ['kernel', 'components', 'node', 'overview'];
    const zhDefinition = resolvePreviewControls(controlModules[buildControlsKey(segments, 'node-shape-connection')]);
    const enDefinition = resolvePreviewControls(
      controlModules[buildLangControlsKey(segments, 'node-shape-connection', 'en')],
    );

    const contractOf = (definition: PreviewControlsDefinition | undefined) => {
      if (!definition || definition.presentation !== 'panel') return [];
      return getPreviewControlFields(definition).map(field => ({
        id: field.id,
        defaultValue: field.defaultValue,
        optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
      }));
    };
    const shapeOptions = ['rectangle', 'circle', 'ellipse', 'diamond', 'polygon', 'star', 'sector', 'arc'];
    const boundaryOptions = ['shape', 'circle', 'rectangle', 'ellipse'];
    const fitOptions = ['tight', 'bounds'];
    const anchorOptions = [
      'auto',
      'center',
      'top',
      'top-right',
      'right',
      'bottom-right',
      'bottom',
      'bottom-left',
      'left',
      'top-left',
    ];
    const expected = [
      { id: 'shapeA', defaultValue: 'star', optionValues: shapeOptions },
      { id: 'boundaryA', defaultValue: 'circle', optionValues: boundaryOptions },
      { id: 'fitA', defaultValue: 'tight', optionValues: fitOptions },
      { id: 'gapA', defaultValue: 0, optionValues: undefined },
      { id: 'anchorA', defaultValue: 'auto', optionValues: anchorOptions },
      { id: 'shapeB', defaultValue: 'ellipse', optionValues: shapeOptions },
      { id: 'boundaryB', defaultValue: 'ellipse', optionValues: boundaryOptions },
      { id: 'fitB', defaultValue: 'tight', optionValues: fitOptions },
      { id: 'gapB', defaultValue: 0, optionValues: undefined },
      { id: 'anchorB', defaultValue: 'auto', optionValues: anchorOptions },
    ];

    expect(contractOf(zhDefinition)).toEqual(expected);
    expect(contractOf(enDefinition)).toEqual(expected);
  });

  it('Node 几何 playground 使用覆盖全部控制极值的固定取景', () => {
    const segments = ['kernel', 'components', 'node', 'overview'];
    const definition = resolvePreviewControls(controlModules[buildControlsKey(segments, 'node-geometry')]);

    expect(definition?.presentation).toBe('panel');
    if (!definition || definition.presentation !== 'panel') return;

    const fields = definition.sections.flatMap(section => section.controls);
    const rangeControl = (id: string) => {
      const field = fields.find(candidate => candidate.id === id);
      if (!field || field.kind !== 'range') throw new Error(`Missing range control: ${id}`);
      return field;
    };
    const rotateControl = rangeControl('rotate');
    const rotateStep = rotateControl.step ?? 1;
    const fixed = nodeGeometryFrame.viewBox;
    const conservativeMeasureText: TextMeasurer = (_text, font) => ({
      width: font.size * 2,
      height: font.size * 2,
      ascent: font.size * 1.6,
      descent: font.size * 0.4,
    });

    for (let rotate = rotateControl.min; rotate <= rotateControl.max; rotate += rotateStep) {
      const { bounds } = compileGeometryNode(
        {
          paddingX: rangeControl('paddingX').max,
          paddingY: rangeControl('paddingY').max,
          // margin 只把连接端点向中心收缩，不扩大节点的可见外框
          margin: 0,
          minimumWidth: rangeControl('minimumWidth').max,
          minimumHeight: rangeControl('minimumHeight').max,
          cornerRadius: rangeControl('cornerRadius').max,
          scale: rangeControl('scale').max,
          rotate,
        },
        conservativeMeasureText,
      );

      expect(bounds.x).toBeGreaterThanOrEqual(fixed.x);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(fixed.x + fixed.width);
      expect(bounds.y).toBeGreaterThanOrEqual(fixed.y);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(fixed.y + fixed.height);
    }
  });

  it('Node 几何 playground 默认最小尺寸不遮蔽 padding', () => {
    const segments = ['kernel', 'components', 'node', 'overview'];
    const definition = resolvePreviewControls(controlModules[buildControlsKey(segments, 'node-geometry')]);

    expect(definition?.presentation).toBe('panel');
    if (!definition || definition.presentation !== 'panel') return;

    const defaults = Object.fromEntries(
      getPreviewControlFields(definition).map(field => [field.id, field.defaultValue]),
    );
    expect(defaults).toMatchObject({
      paddingX: 18,
      paddingY: 10,
      minimumWidth: 40,
      minimumHeight: 24,
    });
    const numericDefault = (id: string) => {
      const value = defaults[id];
      if (typeof value !== 'number') throw new Error(`Missing numeric default: ${id}`);
      return value;
    };
    const common = {
      margin: numericDefault('margin'),
      minimumWidth: numericDefault('minimumWidth'),
      minimumHeight: numericDefault('minimumHeight'),
      cornerRadius: numericDefault('cornerRadius'),
      scale: numericDefault('scale'),
      rotate: numericDefault('rotate'),
    };
    const unpadded = compileGeometryNode({ ...common, paddingX: 0, paddingY: 0 });
    const padded = compileGeometryNode({
      ...common,
      paddingX: numericDefault('paddingX'),
      paddingY: numericDefault('paddingY'),
    });

    expect(padded.layout.rect.width).toBeGreaterThan(unpadded.layout.rect.width);
    expect(padded.layout.rect.height).toBeGreaterThan(unpadded.layout.rect.height);
  });

  it('Node 形状 playground 用双层辅助轮廓替代静态 boundary demo', () => {
    const segments = ['kernel', 'components', 'node', 'overview'];
    const source = demoSources[buildKey(segments, 'node-shape-connection')];

    expect(source).toContain('shapes={[boundaryGuideShape]}');
    expect(source?.match(/^\s*<BoundaryGuide$/gm)).toHaveLength(2);
    expect(source).toContain('dashPattern={[1, 4]}');
    expect(demoSources[buildKey(segments, 'node-boundary-surfaces')]).toBeUndefined();
    expect(demoSources[buildKey(segments, 'node-boundary')]).toBeUndefined();
  });

  it('Node 形状 playground 为两组 controls 预留完整高度', () => {
    const contentRoot = resolve('src/modules/docs/contents/kernel/components/node/overview');

    for (const locale of ['zh', 'en']) {
      const pageSource = readFileSync(resolve(contentRoot, `index.${locale}.mdx`), 'utf8');
      expect(pageSource).toContain(
        "<ComponentPreview files={['node-shape-connection', 'node-shape-connection-boundary.ts']} size=\"md\" />",
      );
    }
  });

  it('Primitive Model playground 用同源虚线轮廓显示规则 boundary', () => {
    const segments = ['kernel', 'concepts', 'core', 'primitive-model'];
    const contentRoot = resolve('src/modules/docs/contents/kernel/concepts/core/primitive-model');
    const helperPath = resolve(contentRoot, 'primitive-model-playground-boundary.ts');
    const source = demoSources[buildKey(segments, 'primitive-model-playground')];
    const helperSource = existsSync(helperPath) ? readFileSync(helperPath, 'utf8') : '';

    expect(source).toContain('shapes={[primitiveModelBoundaryGuideShape]}');
    expect(source).toContain('<BoundaryGuide shape=');
    expect(source).toContain('dashPattern={[6, 4]}');
    expect(helperSource).toContain("if (params.boundary === 'shape') return;");
    expect(helperSource).toContain('visual.definition.connectionEnvelope?.');
    expect(helperSource).toContain('boundsConnectionEnvelope');

    for (const locale of ['zh', 'en']) {
      const pageSource = readFileSync(resolve(contentRoot, `index.${locale}.mdx`), 'utf8');
      expect(pageSource).toContain("files={['primitive-model-playground', 'primitive-model-playground-boundary.ts']}");
    }
  });

  it('Coordinate 比例定位 playground 以真实 Coordinate 承载可调位置', () => {
    const segments = ['kernel', 'components', 'node', 'coordinate'];
    const source = demoSources[buildKey(segments, 'coordinate-between')];

    expect(source).toContain("import { Coordinate, Draw, Layout, Node } from '@retikz/react';");
    expect(source).toMatch(/<Coordinate\s+id="Q"/);
    expect(source).toContain("position={{ of: 'Q', offset: [0, 0] }}");
  });

  it('会改变包围盒的 Node controls playground 使用固定 viewBox', () => {
    const overviewSegments = ['kernel', 'components', 'node', 'overview'];
    const textSegments = ['kernel', 'components', 'node', 'text'];
    const cases = [
      demoSources[buildKey(overviewSegments, 'node-shape-connection')],
      demoSources[buildKey(overviewSegments, 'node-styled')],
      demoSources[resolveDemoKey(textSegments, 'text-attrs', 'zh')],
      demoSources[resolveDemoKey(textSegments, 'text-attrs', 'en')],
    ];

    for (const source of cases) expect(source).toMatch(/viewBox=\{\{ x: -?\d+/);
  });

  it('Node 公共样式 playground 固定内容与形状，只暴露公共视觉属性', () => {
    const segments = ['kernel', 'components', 'node', 'overview'];
    const expectedIds = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'fill',
      'stroke',
      'strokeWidth',
      'dashed',
      'opacity',
    ];

    for (const definition of [
      resolvePreviewControls(controlModules[buildControlsKey(segments, 'node-styled')]),
      resolvePreviewControls(controlModules[buildLangControlsKey(segments, 'node-styled', 'en')]),
    ]) {
      expect(definition?.presentation).toBe('panel');
      if (!definition || definition.presentation !== 'panel') continue;
      expect(definition.sections.flatMap(section => section.controls.map(field => field.id))).toEqual(expectedIds);
    }

    const source = demoSources[buildKey(segments, 'node-styled')];
    expect(source).toContain('shape="rectangle"');
    expect(source).toMatch(/>\s*Node\s*<\/Node>/);
  });

  it('Node 标签仅在启用旋转时显示 keepUpright', () => {
    const segments = ['kernel', 'components', 'node', 'overview'];
    const definitions = [
      resolvePreviewControls(controlModules[buildControlsKey(segments, 'node-label')]),
      resolvePreviewControls(controlModules[buildLangControlsKey(segments, 'node-label', 'en')]),
    ];

    const visibleIds = (definition: PreviewControlsDefinition | undefined, rotateMode: string) =>
      definition?.presentation === 'panel'
        ? resolveVisiblePreviewControlSections(definition.sections, {
            placement: 'outside',
            pinStyle: 'none',
            positionMode: 'direction',
            rotateMode,
          }).flatMap(section => section.controls.map(field => field.id))
        : [];

    for (const definition of definitions) {
      expect(visibleIds(definition, 'none')).not.toContain('keepUpright');
      expect(visibleIds(definition, 'radial')).toContain('keepUpright');
      expect(visibleIds(definition, 'tangent')).toContain('keepUpright');
      expect(visibleIds(definition, 'angle')).toContain('keepUpright');
    }
  });

  it('Node 文本默认内容使用双语共享的中性行标记', () => {
    const segments = ['kernel', 'components', 'node', 'overview'];

    for (const definition of [
      resolvePreviewControls(controlModules[buildControlsKey(segments, 'node-text')]),
      resolvePreviewControls(controlModules[buildLangControlsKey(segments, 'node-text', 'en')]),
    ]) {
      expect(definition?.presentation).toBe('panel');
      if (!definition || definition.presentation !== 'panel') continue;
      const content = getPreviewControlFields(definition).find(field => field.id === 'content');
      expect(content?.defaultValue).toBe('A\nB\nC');
    }
  });

  it('合并后的 Node label 文档保留数组写法', () => {
    const contentRoot = resolve('src/modules/docs/contents/kernel/components/node/overview');

    for (const locale of ['zh', 'en']) {
      const pageSource = readFileSync(resolve(contentRoot, `index.${locale}.mdx`), 'utf8');
      expect(pageSource).toContain('label={[');
    }
  });

  it('新增 controls demo 导出 previewControls 作为注册兜底', () => {
    const cases = [
      { segments: ['kernel', 'components', 'node', 'overview'], name: 'node-geometry', language: 'zh' },
      { segments: ['kernel', 'components', 'node', 'overview'], name: 'node-position', language: 'zh' },
      { segments: ['kernel', 'components', 'node', 'overview'], name: 'node-shape-connection', language: 'zh' },
      { segments: ['kernel', 'components', 'node', 'overview'], name: 'node-styled', language: 'zh' },
      { segments: ['kernel', 'components', 'node', 'overview'], name: 'node-z-index', language: 'zh' },
      { segments: ['kernel', 'components', 'node', 'text'], name: 'text-attrs', language: 'zh' },
      { segments: ['kernel', 'components', 'node', 'text'], name: 'text-attrs', language: 'en' },
    ] as const;

    for (const item of cases) {
      const source = demoSources[resolveDemoKey([...item.segments], item.name, item.language)];
      expect(source, `${item.name} ${item.language}`).toContain('export const previewControls =');
    }
  });

  it('Grid playground 覆盖完整语义并按状态隐藏无效字段', () => {
    const segments = ['standard', 'composite', 'grid'];
    expect(Object.keys(controlModules).filter(key => key.includes('/standard/composite/grid/'))).toEqual([
      buildControlsKey(segments, 'grid-playground'),
      buildLangControlsKey(segments, 'grid-playground', 'en'),
    ]);
    const zhDefinition = resolvePreviewControls(controlModules[buildControlsKey(segments, 'grid-playground')]);
    const enDefinition = resolvePreviewControls(
      controlModules[buildLangControlsKey(segments, 'grid-playground', 'en')],
    );

    expect(zhDefinition?.presentation).toBe('panel');
    expect(enDefinition?.presentation).toBe('panel');
    expect(controlDefinitionContractOf(enDefinition as PreviewControlsDefinition)).toEqual(
      controlDefinitionContractOf(zhDefinition as PreviewControlsDefinition),
    );
    expect(getPreviewControlFields(zhDefinition as PreviewControlsDefinition).slice(0, 2)).toMatchObject([
      {
        id: 'boundsMin',
        kind: 'point',
        defaultValue: [60, 50],
      },
      {
        id: 'boundsMax',
        kind: 'point',
        defaultValue: [340, 230],
      },
    ]);
    expect(getPreviewControlFields(zhDefinition as PreviewControlsDefinition).map(field => field.label)).toEqual(
      expect.arrayContaining([
        '起始',
        '终止',
        '间距模式',
        '横向间距',
        '纵向间距',
        '自定义原点',
        '包含边界',
        '启用主线',
        '主线间隔',
        '主线偏移',
        '启用边框',
        '边框外扩',
        '绘制顺序',
        '延伸网格线',
      ]),
    );

    const visibleFieldIds = (definition: PreviewControlsDefinition | undefined, values: PreviewControlValues) =>
      definition?.presentation === 'panel'
        ? resolveVisiblePreviewControlSections(definition.sections, values).flatMap(section =>
            section.controls.map(field => field.id),
          )
        : [];
    const disabledValues = {
      spacingMode: 'uniform',
      originEnabled: false,
      majorEnabled: false,
      borderEnabled: false,
    };
    const disabledIds = visibleFieldIds(zhDefinition, disabledValues);

    expect(disabledIds).toContain('spacing');
    expect(disabledIds).not.toContain('spacingX');
    expect(disabledIds).not.toContain('originX');
    expect(disabledIds).not.toContain('majorEvery');
    expect(disabledIds).not.toContain('borderPadding');

    const enabledIds = visibleFieldIds(zhDefinition, {
      spacingMode: 'axis',
      originEnabled: true,
      majorEnabled: true,
      borderEnabled: true,
    });
    expect(enabledIds).not.toContain('spacing');
    expect(enabledIds).toEqual(
      expect.arrayContaining(['spacingX', 'spacingY', 'originX', 'originY', 'majorEvery', 'borderPadding']),
    );

    const source = demoSources[buildKey(segments, 'grid-playground')];
    expect(source).toContain('export const previewControls =');
    expect(source).toContain('defineControlledPreview(previewControlContract');
    expect(source).toMatch(/viewBox=\{\{ x: 0, y: 0, width: 400, height: 280 \}\}/u);
  });

  it('Grid 文档按基础、常见变体和 playground 递进，并用自绘图解释 lowering', () => {
    const contentRoot = resolve('src/modules/docs/contents/standard/composite/grid');
    const basicSource = demoSources[buildKey(['standard', 'composite', 'grid'], 'grid-basic')];

    for (const locale of ['zh', 'en']) {
      const pageSource = readFileSync(resolve(contentRoot, `index.${locale}.mdx`), 'utf8');
      const variantsSource = demoSources[resolveDemoKey(['standard', 'composite', 'grid'], 'grid-variants', locale)];
      const previewNames = Array.from(
        pageSource.matchAll(/<ComponentPreview\b[^>]*\bfiles="([^"]+)"/gu),
        match => match[1],
      );

      expect(previewNames).toEqual(['grid-basic', 'grid-variants', 'grid-playground', 'grid-lowering']);
      expect(pageSource).toContain('<ComponentPreview files="grid-variants" size="sm" />');
      expect(pageSource).toContain('<ComponentPreview files="grid-lowering" hideCode');
      expect(variantsSource).toContain('<Layout width={760} height={145}');
      expect(variantsSource?.match(/position=\{\[\d+, 18\]\}/gu)).toHaveLength(4);
    }

    expect(basicSource).toContain("border={{ style: { stroke: 'gray' } }}");
    expect(demoSources[resolveDemoKey(['standard', 'composite', 'grid'], 'grid-variants', 'zh')]).toBeDefined();
    expect(demoSources[resolveDemoKey(['standard', 'composite', 'grid'], 'grid-variants', 'en')]).toBeDefined();
    expect(demoSources[resolveDemoKey(['standard', 'composite', 'grid'], 'grid-lowering', 'zh')]).toBeDefined();
    expect(demoSources[resolveDemoKey(['standard', 'composite', 'grid'], 'grid-lowering', 'en')]).toBeDefined();
  });

  it('Frame 文档按组合语义递进，并以双语 controls 和自绘图闭合三条入口', () => {
    const segments = ['standard', 'composite', 'frame'];
    const controlsKeys = Object.keys(controlModules).filter(key => key.includes('/standard/composite/frame/'));

    expect(controlsKeys).toEqual([
      buildControlsKey(segments, 'frame-playground'),
      buildLangControlsKey(segments, 'frame-playground', 'en'),
    ]);

    const zhDefinition = resolvePreviewControls(controlModules[buildControlsKey(segments, 'frame-playground')]);
    const enDefinition = resolvePreviewControls(
      controlModules[buildLangControlsKey(segments, 'frame-playground', 'en')],
    );

    expect(zhDefinition?.presentation).toBe('panel');
    expect(enDefinition?.presentation).toBe('panel');
    expect(controlDefinitionContractOf(enDefinition as PreviewControlsDefinition)).toEqual(
      controlDefinitionContractOf(zhDefinition as PreviewControlsDefinition),
    );
    expect(getPreviewControlFields(zhDefinition as PreviewControlsDefinition).map(field => field.id)).toEqual([
      'paddingX',
      'paddingY',
      'gap',
      'headerDirection',
      'borderStroke',
      'strokeWidth',
      'strokeOpacity',
      'borderLineStyle',
      'fillOpacity',
      'titlePadding',
      'titleFontSize',
      'titleFontWeight',
      'titleFillOpacity',
      'descriptionFontSize',
      'descriptionOpacity',
      'nodeAText',
      'nodeBText',
      'connected',
    ]);

    const playgroundSource = demoSources[buildKey(segments, 'frame-playground')];
    expect(playgroundSource).toContain('export const previewControls =');
    expect(playgroundSource).toContain('defineControlledPreview(previewControlContract');
    expect(playgroundSource).toMatch(/viewBox=\{\{ x: 0, y: 0, width: 420, height: 260 \}\}/u);
    expect(playgroundSource).toContain('headerDirection={values.headerDirection}');
    expect(playgroundSource).toContain("values.borderLineStyle === 'dotted'");
    expect(playgroundSource).toContain("lineCap: 'round'");
    expect(playgroundSource).toContain('text={values.nodeAText}');
    expect(playgroundSource).toContain('text={values.nodeBText}');
    expect(playgroundSource).toContain('values.connected ? <Draw');
    expect(playgroundSource).toContain("way={['A', 'B']}");

    const contentRoot = resolve('src/modules/docs/contents/standard/composite/frame');
    for (const locale of ['zh', 'en']) {
      const pageSource = readFileSync(resolve(contentRoot, `index.${locale}.mdx`), 'utf8');
      const previewNames = Array.from(
        pageSource.matchAll(/<ComponentPreview\b[^>]*\bfiles="([^"]+)"/gu),
        match => match[1],
      );

      expect(previewNames).toEqual(['frame-basic', 'frame-variants', 'frame-playground', 'frame-lowering']);
      expect(pageSource).toContain('<ComponentPreview files="frame-lowering" hideCode');
      expect(demoSources[resolveDemoKey(segments, 'frame-basic', locale)]).toBeDefined();
      expect(demoSources[resolveDemoKey(segments, 'frame-variants', locale)]).toBeDefined();
      expect(demoSources[resolveDemoKey(segments, 'frame-lowering', locale)]).toBeDefined();
    }
  });

  it('Channel 文档把参数型静态示例收敛为六个双语 controls playground', () => {
    const bindingSegments = ['viz', 'plot', 'channel', 'binding'];
    const builtinSegments = ['viz', 'plot', 'channel', 'builtin'];
    const expectedControls = [
      { segments: bindingSegments, name: 'channel-binding' },
      { segments: builtinSegments, name: 'builtin-position' },
      { segments: builtinSegments, name: 'builtin-point-style' },
      { segments: builtinSegments, name: 'builtin-node-text' },
      { segments: builtinSegments, name: 'builtin-path-style' },
      { segments: builtinSegments, name: 'builtin-other' },
    ];

    expect(Object.keys(controlModules).filter(key => key.includes('builtin-position'))).toEqual([
      buildControlsKey(builtinSegments, 'builtin-position'),
      buildLangControlsKey(builtinSegments, 'builtin-position', 'en'),
    ]);

    for (const { segments, name } of expectedControls) {
      const controlKey = `../../contents/${segments.join('/')}/${name}.controls.ts`;
      const englishControlKey = `../../contents/${segments.join('/')}/${name}.en.controls.ts`;
      const source = demoSources[buildKey(segments, name)];

      expect(controlModules[controlKey], controlKey).toBeDefined();
      expect(controlModules[englishControlKey], englishControlKey).toBeDefined();
      expect(source, buildKey(segments, name)).toContain('export const previewControls =');
      expect(source, buildKey(segments, name)).toContain('defineControlledPreview(previewControlContract');
    }

    for (const language of ['zh', 'en'] as const) {
      const definition = resolvePreviewControls(
        controlModules[
          language === 'zh'
            ? buildControlsKey(bindingSegments, 'channel-binding')
            : buildLangControlsKey(bindingSegments, 'channel-binding', 'en')
        ],
      );
      const tables =
        definition?.presentation === 'panel'
          ? definition.sections.flatMap(section =>
              section.controls.flatMap(field =>
                field.kind === 'table'
                  ? [
                      {
                        id: field.id,
                        rowCount: field.rows.length,
                        columnKeys: field.columns?.map(column => column.key),
                      },
                    ]
                  : [],
              ),
            )
          : [];

      expect(
        definition?.presentation === 'panel' ? definition.sections[0]?.controls.map(control => control.id) : [],
        language,
      ).toEqual(['cities']);
      expect(tables, language).toEqual([
        {
          id: 'cities',
          rowCount: 8,
          columnKeys: ['city', 'abbr', 'region', 'gdp', 'life', 'population'],
        },
      ]);
    }

    const builtinDataTables = [
      {
        name: 'builtin-position',
        rowCount: 5,
        columnKeys: ['month', 'sales', 'profit', 'orders', 'averageOrder'],
        defaultCollapsed: false,
      },
      { name: 'builtin-point-style', rowCount: 5, columnKeys: ['x', 'y'], defaultCollapsed: true },
      {
        name: 'builtin-node-text',
        rowCount: 3,
        columnKeys: ['x', 'nodeY', 'textY', 'word', 'tag'],
        defaultCollapsed: true,
      },
      { name: 'builtin-path-style', rowCount: 5, columnKeys: ['step', 'value'], defaultCollapsed: true },
      { name: 'builtin-other', rowCount: 6, columnKeys: ['step', 'value', 'series'], defaultCollapsed: false },
    ];

    for (const { name, rowCount, columnKeys, defaultCollapsed } of builtinDataTables) {
      for (const language of ['zh', 'en'] as const) {
        const definition = resolvePreviewControls(
          controlModules[
            language === 'zh'
              ? buildControlsKey(builtinSegments, name)
              : buildLangControlsKey(builtinSegments, name, 'en')
          ],
        );
        const tables =
          definition?.presentation === 'panel'
            ? definition.sections.flatMap(section =>
                section.controls.flatMap(field =>
                  field.kind === 'table'
                    ? [
                        {
                          id: field.id,
                          rowCount: field.rows.length,
                          columnKeys: field.columns?.map(column => column.key),
                        },
                      ]
                    : [],
                ),
              )
            : [];

        expect(
          definition?.presentation === 'panel' ? definition.sections[0]?.controls.map(control => control.id) : [],
          `${name}:${language}`,
        ).toEqual(['rows']);
        expect(
          definition?.presentation === 'panel' ? Boolean(definition.sections[0]?.defaultCollapsed) : false,
          `${name}:${language}`,
        ).toBe(defaultCollapsed);
        expect(tables, `${name}:${language}`).toEqual([{ id: 'rows', rowCount, columnKeys }]);
      }
    }

    const nodeTextSource = demoSources[buildKey(builtinSegments, 'builtin-node-text')];
    expect(nodeTextSource).toContain('<PointMark\n      x="x"\n      y="nodeY"');
    expect(nodeTextSource).toContain('<PointMark\n      x="x"\n      y="textY"\n      text="word"');

    const bindingRoot = resolve('src/modules/docs/contents/viz/plot/channel/binding');
    const builtinRoot = resolve('src/modules/docs/contents/viz/plot/channel/builtin');
    for (const locale of ['zh', 'en']) {
      const bindingPage = readFileSync(resolve(bindingRoot, `index.${locale}.mdx`), 'utf8');
      const builtinPage = readFileSync(resolve(builtinRoot, `index.${locale}.mdx`), 'utf8');
      const fieldsHeading = locale === 'zh' ? '## 字段与常量' : '## Fields And Constants';
      const playgroundHeading = locale === 'zh' ? '## 绑定试验场' : '## Binding Playground';
      const builtinPreviews = Array.from(
        builtinPage.matchAll(/<ComponentPreview\b[^>]*\bfiles=(?:"([^"]+)"|\{\['([^']+)'[^\]]*\]\})/gu),
        match => {
          const stringFile = Reflect.get(match, 1);
          const arrayFile = Reflect.get(match, 2);
          return typeof stringFile === 'string' ? stringFile : typeof arrayFile === 'string' ? arrayFile : '';
        },
      );

      expect(bindingPage).toContain("files={['channel-binding', 'channel-binding.data.ts']}");
      for (const previewName of [
        'builtin-position',
        'builtin-point-style',
        'builtin-node-text',
        'builtin-path-style',
        'builtin-other',
      ]) {
        expect(builtinPage).toContain(`files={['${previewName}', '${previewName}.data.ts']}`);
      }
      expect(bindingPage.indexOf(fieldsHeading), locale).toBeLessThan(bindingPage.indexOf(playgroundHeading));
      expect(builtinPreviews).toEqual([
        'builtin-position',
        'builtin-point-style',
        'builtin-node-text',
        'builtin-path-style',
        'builtin-other',
      ]);
    }

    for (const removedDemo of [
      'builtin-arrow',
      'builtin-color',
      'builtin-effect',
      'builtin-node-geometry',
      'builtin-opacity',
      'builtin-shape',
      'builtin-size',
      'builtin-text-label',
      'builtin-text-node',
    ]) {
      expect(demoSources[buildKey(builtinSegments, removedDemo)], removedDemo).toBeUndefined();
    }
  });

  it('内置节点 playground 的 padding 从默认值上调一步即可改变空节点尺寸', () => {
    const segments = ['viz', 'plot', 'channel', 'builtin'];

    for (const language of ['zh', 'en'] as const) {
      const definition = resolvePreviewControls(
        controlModules[
          language === 'zh'
            ? buildControlsKey(segments, 'builtin-node-text')
            : buildLangControlsKey(segments, 'builtin-node-text', 'en')
        ],
      );
      expect(definition?.presentation, language).toBe('panel');
      if (!definition || definition.presentation !== 'panel') continue;

      const fields = getPreviewControlFields(definition);
      const padding = fields.find(field => field.id === 'padding');
      const minimumSize = fields.find(field => field.id === 'minimumSize');
      expect(padding?.kind, language).toBe('range');
      expect(minimumSize?.kind, language).toBe('range');
      if (padding?.kind !== 'range' || minimumSize?.kind !== 'range') continue;

      const compileGlyph = (paddingValue: number): CompiledNodeLayout => {
        let layout: CompiledNodeLayout | undefined;
        compileToScene(
          {
            type: 'scene',
            version: 1,
            children: [
              {
                type: 'node',
                position: [0, 0],
                shape: 'rectangle',
                padding: paddingValue,
                minimumSize: minimumSize.defaultValue,
              },
            ],
          } satisfies IRScene,
          {
            onNodeLayout: nextLayout => {
              layout = nextLayout;
            },
            padding: 0,
          },
        );
        if (!layout) throw new Error('Missing compiled point glyph layout');
        return layout;
      };

      const current = compileGlyph(padding.defaultValue);
      const increased = compileGlyph(padding.defaultValue + (padding.step ?? 1));

      expect(increased.rect.width, language).toBeGreaterThan(current.rect.width);
      expect(increased.rect.height, language).toBeGreaterThan(current.rect.height);
    }
  });

  it('内置节点 playground 的文本默认形成宽度不同的多行，使文字对齐可见', () => {
    const segments = ['viz', 'plot', 'channel', 'builtin'];
    const definition = resolvePreviewControls(controlModules[buildControlsKey(segments, 'builtin-node-text')]);
    expect(definition?.presentation).toBe('panel');
    if (!definition || definition.presentation !== 'panel') return;

    const defaults = Object.fromEntries(
      getPreviewControlFields(definition).map(field => [field.id, field.defaultValue]),
    );
    const compiled = compileBuiltinText(nodeTextRows[0].word, {
      align: defaults.align as 'start' | 'middle' | 'end',
      fontSize: defaults.fontSize as number,
      lineHeight: defaults.lineHeight as number,
      maxTextWidth: defaults.maxTextWidth as number,
    });
    const lineLengths = new Set(compiled.text.lines.map(line => line.text.length));

    expect(compiled.layout.text.lineCount).toBeGreaterThan(1);
    expect(lineLengths.size).toBeGreaterThan(1);
  });

  it('内置节点 playground 的默认行高不会让多行文字重叠', () => {
    const segments = ['viz', 'plot', 'channel', 'builtin'];
    const definition = resolvePreviewControls(controlModules[buildControlsKey(segments, 'builtin-node-text')]);
    expect(definition?.presentation).toBe('panel');
    if (!definition || definition.presentation !== 'panel') return;

    const defaults = Object.fromEntries(
      getPreviewControlFields(definition).map(field => [field.id, field.defaultValue]),
    );
    const compiled = compileBuiltinText(nodeTextRows[0].word, {
      align: defaults.align as 'start' | 'middle' | 'end',
      fontSize: defaults.fontSize as number,
      lineHeight: defaults.lineHeight as number,
      maxTextWidth: defaults.maxTextWidth as number,
    });

    expect(compiled.layout.text.lineCount).toBeGreaterThan(1);
    expect(compiled.layout.content.size.height / compiled.layout.text.lineCount).toBeGreaterThanOrEqual(
      defaults.fontSize as number,
    );
  });

  it('内置节点 playground 的文字宽度范围会改变实际折行数', () => {
    const segments = ['viz', 'plot', 'channel', 'builtin'];
    const definition = resolvePreviewControls(controlModules[buildControlsKey(segments, 'builtin-node-text')]);
    expect(definition?.presentation).toBe('panel');
    if (!definition || definition.presentation !== 'panel') return;

    const fields = getPreviewControlFields(definition);
    const align = fields.find(field => field.id === 'align');
    const fontSize = fields.find(field => field.id === 'fontSize');
    const lineHeight = fields.find(field => field.id === 'lineHeight');
    const maxTextWidth = fields.find(field => field.id === 'maxTextWidth');
    expect(align?.kind).toBe('select');
    expect(fontSize?.kind).toBe('range');
    expect(lineHeight?.kind).toBe('range');
    expect(maxTextWidth?.kind).toBe('range');
    if (
      align?.kind !== 'select' ||
      fontSize?.kind !== 'range' ||
      lineHeight?.kind !== 'range' ||
      maxTextWidth?.kind !== 'range'
    ) {
      return;
    }

    const common = {
      align: align.defaultValue as 'start' | 'middle' | 'end',
      fontSize: fontSize.defaultValue,
      lineHeight: lineHeight.defaultValue,
    };
    const narrow = compileBuiltinText(nodeTextRows[0].word, {
      ...common,
      maxTextWidth: maxTextWidth.min,
    });
    const wide = compileBuiltinText(nodeTextRows[0].word, {
      ...common,
      maxTextWidth: maxTextWidth.max,
    });

    expect(narrow.layout.text.lineCount).toBeGreaterThan(wide.layout.text.lineCount);
  });

  it('内置路径 playground 仅在尖折点下显示连接样式', () => {
    const segments = ['viz', 'plot', 'channel', 'builtin'];
    const definitions = [
      resolvePreviewControls(controlModules[buildControlsKey(segments, 'builtin-path-style')]),
      resolvePreviewControls(controlModules[buildLangControlsKey(segments, 'builtin-path-style', 'en')]),
    ];
    const visibleIds = (definition: PreviewControlsDefinition | undefined, roundedCorners: number) =>
      definition?.presentation === 'panel'
        ? resolveVisiblePreviewControlSections(definition.sections, { roundedCorners }).flatMap(section =>
            section.controls.map(field => field.id),
          )
        : [];

    for (const definition of definitions) {
      expect(definition?.presentation).toBe('panel');
      if (!definition || definition.presentation !== 'panel') continue;

      const roundedCorners = getPreviewControlFields(definition).find(field => field.id === 'roundedCorners');
      expect(roundedCorners?.kind).toBe('range');
      expect(roundedCorners?.defaultValue).toBe(0);
      expect(visibleIds(definition, 0)).toContain('lineJoin');
      expect(visibleIds(definition, 8)).not.toContain('lineJoin');
    }
  });

  it('内置通道总览仅为长通道组主动换行', () => {
    const builtinRoot = resolve('src/modules/docs/contents/viz/plot/channel/builtin');
    const compactChannelGroups = [
      '`x` / `y` / `z`',
      '`text` / `label`',
      '`shadow` / `blendMode`',
      '`zIndex` / `order` / `series`',
    ];

    for (const locale of ['zh', 'en']) {
      const builtinPage = readFileSync(resolve(builtinRoot, `index.${locale}.mdx`), 'utf8');

      for (const channels of compactChannelGroups) {
        expect(builtinPage, `${locale}: ${channels}`).toContain(channels);
      }
    }
  });

  it('一维坐标组合 demo 用双语折叠数据表说明 12 个来源 Node 汇聚为 3 个目标 Node', () => {
    const segments = ['viz', 'plot', 'coordinate', '1d'];
    const name = 'coordinate-1d-composition';

    for (const language of ['zh', 'en'] as const) {
      const controlsKey =
        language === 'zh' ? buildControlsKey(segments, name) : buildLangControlsKey(segments, name, 'en');
      const definition = resolvePreviewControls(controlModules[controlsKey]);

      expect(definition?.presentation, language).toBe('panel');
      if (!definition || definition.presentation !== 'panel') continue;

      const firstSection = definition.sections[0];
      const firstControl = firstSection.controls[0];
      const visibleIds = (values: PreviewControlValues) =>
        resolveVisiblePreviewControlSections(definition.sections, values).flatMap(section =>
          section.controls.map(control => control.id),
        );
      expect(Boolean(firstSection.defaultCollapsed), language).toBe(true);
      expect(firstControl.kind, language).toBe('table');
      if (firstControl.kind !== 'table') continue;

      expect(firstControl.rows, language).toHaveLength(12);
      const targetGroupSizes = firstControl.rows.reduce<Record<string, number>>((groupSizes, row) => {
        const practiceId = Reflect.get(row, 'practiceId');
        expect(typeof practiceId, `${language}: practiceId`).toBe('string');
        if (typeof practiceId !== 'string') return groupSizes;

        groupSizes[practiceId] = (groupSizes[practiceId] ?? 0) + 1;
        return groupSizes;
      }, {});
      expect(Object.values(targetGroupSizes).sort(), language).toEqual([4, 4, 4]);
      expect(
        firstControl.columns?.map(column => column.key),
        language,
      ).toEqual(['thingLabel', 'practiceLabel', 'relationColor']);
      expect(definition.sections, language).toHaveLength(4);
      expect(visibleIds({ routing: 'bend', sourceLabelVisible: true, targetLabelVisible: true }), language).toEqual(
        expect.arrayContaining(['bendDirection', 'bendAngle']),
      );
      expect(visibleIds({ routing: 'line', sourceLabelVisible: true, targetLabelVisible: true }), language).not.toEqual(
        expect.arrayContaining(['bendDirection', 'bendAngle', 'orthogonalVia']),
      );
      expect(
        visibleIds({ routing: 'orthogonal', sourceLabelVisible: false, targetLabelVisible: false }),
        language,
      ).toEqual(expect.arrayContaining(['orthogonalVia']));
      expect(
        visibleIds({ routing: 'orthogonal', sourceLabelVisible: false, targetLabelVisible: false }),
        language,
      ).not.toEqual(
        expect.arrayContaining(['sourceLabelSize', 'sourceLabelRotate', 'sourceLabelDistance', 'targetLabelSize']),
      );
      expect(
        visibleIds({
          routing: 'bend',
          sourceLabelVisible: true,
          targetLabelVisible: true,
          axisVisible: true,
        }),
        language,
      ).toEqual(expect.arrayContaining(['axisVisible', 'axisStroke', 'axisStrokeWidth']));
      expect(
        visibleIds({
          routing: 'bend',
          sourceLabelVisible: true,
          targetLabelVisible: true,
          axisVisible: false,
        }),
        language,
      ).toEqual(expect.arrayContaining(['axisVisible']));
      expect(
        visibleIds({
          routing: 'bend',
          sourceLabelVisible: true,
          targetLabelVisible: true,
          axisVisible: false,
        }),
        language,
      ).not.toEqual(expect.arrayContaining(['axisStroke', 'axisStrokeWidth']));

      const source = demoSources[resolveDemoKey(segments, name, language)];
      expect(source, language).toContain('defineControlledPreview(previewControlContract');
      expect(source, language).toContain("anchorId={{ prefix: 'thing', field: 'thingId' }}");
      expect(source, language).toContain("anchorId={{ prefix: 'practice', field: 'practiceId' }}");
      expect(source, language).toContain("kind: 'summarize'");
      expect(source, language).toContain("'practiceGlyph'");
      expect(source, language).toContain('text="practiceGlyph"');
      expect(source, language).toContain('path={{ routing }}');
      expect(source, language).toContain('COORDINATE_1D_COMPOSITION_CONTROL_IDS.relationStrokeWidth');
      expect(source, language).toContain('COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisVisible');
      expect(source, language).toContain('COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStroke');
      expect(source, language).toContain('COORDINATE_1D_COMPOSITION_CONTROL_IDS.axisStrokeWidth');
      expect(source, language).toContain('<RelationMark');
      expect(source, language).toContain('<Axis');
    }
  });

  it('坐标系 Plot demo 都以本地化数据表作为 control 首个分组', () => {
    const cases = [
      {
        segments: ['viz', 'plot', 'coordinate', '1d'],
        name: 'coordinate-1d-playground',
        rowCount: 8,
        columnKeys: ['hour'],
        defaultCollapsed: true,
      },
      {
        segments: ['viz', 'plot', 'coordinate', '2d'],
        name: 'coordinate-switch',
        rowCount: 6,
        columnKeys: ['month', 'value'],
        defaultCollapsed: true,
      },
      {
        segments: ['viz', 'plot', 'coordinate', '2d'],
        name: 'coordinate-pie',
        rowCount: 5,
        columnKeys: ['label', 'value'],
        defaultCollapsed: true,
      },
      {
        segments: ['viz', 'plot', 'coordinate', '2d'],
        name: 'coordinate-radar',
        rowCount: 5,
        columnKeys: ['dim', 'value'],
        defaultCollapsed: true,
      },
      {
        segments: ['viz', 'plot', 'coordinate', '2d'],
        name: 'coordinate-polar-line',
        rowCount: 8,
        columnKeys: ['angle', 'speed'],
        defaultCollapsed: true,
      },
      {
        segments: ['viz', 'plot', 'coordinate', 'composition'],
        name: 'coordinate-composition-scopes',
        rowCount: 6,
        columnKeys: ['day', 'temperature', 'rainfall'],
        defaultCollapsed: true,
      },
      {
        segments: ['viz', 'plot', 'coordinate', 'composition'],
        name: 'coordinate-composition-x-axis',
        rowCount: 7,
        columnKeys: ['elapsedDay', 'calendarDay', 'completed', 'forecast'],
        defaultCollapsed: true,
      },
      {
        segments: ['viz', 'plot', 'coordinate', 'composition'],
        name: 'coordinate-composition-facet',
        rowCount: 20,
        columnKeys: ['product', 'tier', 'month', 'accounts'],
        defaultCollapsed: true,
      },
      {
        segments: ['viz', 'plot', 'coordinate', 'composition'],
        name: 'coordinate-composition-facet-multilevel',
        rowCount: 64,
        columnKeys: ['business', 'metric', 'region', 'channel', 'month', 'value'],
        defaultCollapsed: true,
      },
      {
        segments: ['viz', 'plot', 'coordinate', 'composition'],
        name: 'coordinate-composition-tracks',
        rowCount: 18,
        columnKeys: ['day', 'trend', 'drawdown', 'signal'],
        defaultCollapsed: true,
      },
      {
        segments: ['viz', 'plot', 'coordinate', 'composition'],
        name: 'coordinate-composition-tracks-polar',
        rowCount: 6,
        columnKeys: ['area', 'order', 'signal', 'capacity', 'outer'],
        defaultCollapsed: true,
      },
    ];

    for (const { segments, name, rowCount, columnKeys, defaultCollapsed } of cases) {
      for (const language of ['zh', 'en'] as const) {
        const key = language === 'zh' ? buildControlsKey(segments, name) : buildLangControlsKey(segments, name, 'en');
        const definition = resolvePreviewControls(controlModules[key]);

        expect(definition?.presentation, `${name}:${language}`).toBe('panel');
        if (!definition || definition.presentation !== 'panel') continue;

        const firstSection = definition.sections[0];
        const firstControl = firstSection.controls[0];
        expect(firstControl.kind, `${name}:${language}`).toBe('table');
        expect(Boolean(firstSection.defaultCollapsed), `${name}:${language}`).toBe(defaultCollapsed);
        if (firstControl.kind !== 'table') continue;

        expect(firstControl.rows, `${name}:${language}`).toHaveLength(rowCount);
        expect(
          firstControl.columns?.map(column => column.key),
          `${name}:${language}`,
        ).toEqual(columnKeys);
        expect(demoSources[buildKey(segments, name)], name).toContain('defineControlledPreview(previewControlContract');
      }
    }
  });

  it('坐标组合 demo 提供结构优先的双语 controls', () => {
    const segments = ['viz', 'plot', 'coordinate', 'composition'];
    const cases = [
      {
        name: 'coordinate-composition-scopes',
        ids: [
          'rows',
          'rainfallAxis',
          'secondaryAxisSide',
          'xGridVisible',
          'yGridVisible',
          'temperatureLineWidth',
          'rainfallLineWidth',
          'rainfallPointsVisible',
          'rainfallPointSize',
        ],
      },
      {
        name: 'coordinate-composition-x-axis',
        ids: [
          'rows',
          'forecastAxis',
          'secondaryAxisSide',
          'xGridVisible',
          'yGridVisible',
          'completedLineWidth',
          'forecastLineWidth',
          'forecastPointsVisible',
          'forecastPointSize',
        ],
      },
      {
        name: 'coordinate-composition-facet',
        ids: [
          'rows',
          'layout',
          'scale',
          'empty',
          'headers',
          'panelGap',
          'xGridVisible',
          'yGridVisible',
          'lineWidth',
          'pointSize',
        ],
      },
      {
        name: 'coordinate-composition-facet-multilevel',
        ids: [
          'rows',
          'rowHierarchy',
          'columnHierarchy',
          'rowHeaders',
          'columnHeaders',
          'scale',
          'panelGap',
          'xGridVisible',
          'yGridVisible',
          'lineWidth',
          'pointSize',
        ],
      },
      {
        name: 'coordinate-composition-tracks',
        ids: [
          'rows',
          'bandProfile',
          'trackGap',
          'xGridVisible',
          'yGridVisible',
          'localAxes',
          'lineWidth',
          'drawdownAreaVisible',
          'signalPointSize',
        ],
      },
      {
        name: 'coordinate-composition-tracks-polar',
        ids: [
          'rows',
          'innerRadius',
          'startAngle',
          'sweepAngle',
          'trackGap',
          'xGridVisible',
          'yGridVisible',
          'localAxes',
          'lineWidth',
          'pointSize',
          'sectorPadAngle',
          'sectorOpacity',
        ],
      },
    ];

    for (const { name, ids } of cases) {
      for (const language of ['zh', 'en'] as const) {
        const key = language === 'zh' ? buildControlsKey(segments, name) : buildLangControlsKey(segments, name, 'en');
        const definition = resolvePreviewControls(controlModules[key]);

        expect(definition?.presentation, `${name}:${language}`).toBe('panel');
        if (!definition || definition.presentation !== 'panel') continue;

        expect(definition.sections.length, `${name}:${language}`).toBeGreaterThan(1);
        expect(
          definition.sections.flatMap(section => section.controls.map(control => control.id)),
          `${name}:${language}`,
        ).toEqual(ids);
      }
    }
  });

  it('坐标系试验场只显示当前形态相关的配置', () => {
    const oneDimensionalSegments = ['viz', 'plot', 'coordinate', '1d'];
    const facetSegments = ['viz', 'plot', 'coordinate', 'composition'];
    const oneDimensional = resolvePreviewControls(
      controlModules[buildControlsKey(oneDimensionalSegments, 'coordinate-1d-playground')],
    );
    const facet = resolvePreviewControls(
      controlModules[buildControlsKey(facetSegments, 'coordinate-composition-facet')],
    );

    const visibleIds = (definition: PreviewControlsDefinition | undefined, values: PreviewControlValues) =>
      definition?.presentation === 'panel'
        ? resolveVisiblePreviewControlSections(definition.sections, values).flatMap(section =>
            section.controls.map(control => control.id),
          )
        : [];

    expect(visibleIds(oneDimensional, { coordinate: 'cartesian1D', axisVisible: true })).toEqual([
      'rows',
      'coordinate',
      'orientation',
      'pointSize',
      'pointFill',
      'pointStroke',
      'pointStrokeWidth',
      'pointOpacity',
      'axisVisible',
      'axisStroke',
      'axisStrokeWidth',
    ]);
    expect(visibleIds(oneDimensional, { coordinate: 'polar1D', axisVisible: true })).toEqual([
      'rows',
      'coordinate',
      'radius',
      'startAngle',
      'sweepAngle',
      'pointSize',
      'pointFill',
      'pointStroke',
      'pointStrokeWidth',
      'pointOpacity',
      'axisVisible',
      'axisStroke',
      'axisStrokeWidth',
    ]);
    expect(visibleIds(oneDimensional, { coordinate: 'cartesian1D', axisVisible: false })).toEqual([
      'rows',
      'coordinate',
      'orientation',
      'pointSize',
      'pointFill',
      'pointStroke',
      'pointStrokeWidth',
      'pointOpacity',
      'axisVisible',
    ]);
    expect(visibleIds(facet, { layout: 'columns' })).not.toContain('empty');
    expect(visibleIds(facet, { layout: 'grid' })).toContain('empty');
  });

  it('所有 controls 显式声明完整且双语一致的文档契约', () => {
    const prefix = '../../contents/';
    const entries = Object.entries(controlModules).filter(
      ([key]) => key.startsWith(prefix) && key.endsWith('.controls.ts') && !key.endsWith('.en.controls.ts'),
    );

    expect(entries.length).toBeGreaterThan(0);
    for (const [key, mod] of entries) {
      expect(mod, key).toBeDefined();
      expect(Object.hasOwn(mod ?? {}, 'previewControlContract'), key).toBe(true);

      const contract = resolvePreviewControlContract(mod);
      expect(contract, key).toBeDefined();
      if (!contract) continue;

      const englishKey = key.replace(/\.controls\.ts$/u, '.en.controls.ts');
      const englishModule = controlModules[englishKey];
      expect(englishModule, englishKey).toBeDefined();
      expect(Object.hasOwn(englishModule ?? {}, 'previewControlContract'), englishKey).toBe(true);

      const englishContract = resolvePreviewControlContract(englishModule);
      expect(englishContract, englishKey).toBeDefined();
      if (!englishContract) continue;

      const ids = getPreviewControlFields(contract.controls)
        .map(field => field.id)
        .sort();
      expect(Object.keys(contract.canonicalValues).sort(), key).toEqual(ids);
      expect(contract.relatedApis.length, key).toBeGreaterThan(0);
      expect(controlDefinitionContractOf(englishContract.controls), englishKey).toEqual(
        controlDefinitionContractOf(contract.controls),
      );
      expect(englishContract.canonicalValues, englishKey).toEqual(contract.canonicalValues);
      expect(
        englishContract.presets?.map(preset => ({ id: preset.id, values: preset.values })),
        englishKey,
      ).toEqual(contract.presets?.map(preset => ({ id: preset.id, values: preset.values })));
      expect(englishContract.relatedApis, englishKey).toEqual(contract.relatedApis);
    }
  });

  it('Kernel Components controls demo 显式导出 previewControls 回退', () => {
    const prefix = '../../contents/kernel/components/';
    const entries = Object.entries(demoSources).filter(
      ([key, source]) => key.startsWith(prefix) && source?.includes('usePreviewControls('),
    );

    expect(entries.length).toBeGreaterThan(0);
    for (const [key, source] of entries) {
      expect(source, key).toContain('export const previewControls =');
    }
  });

  it('Kernel Components controls demo 的右侧输出宽度默认不超过 400px，例外不超过 600px', () => {
    const prefix = '../../contents/kernel/components/';
    const validatedWiderLayouts = new Set<string>();
    const widerThanPreferred = Object.entries(demoSources)
      .filter(([key, source]) => key.startsWith(prefix) && source?.includes('usePreviewControls('))
      .flatMap(([key, source]) =>
        Array.from(source?.matchAll(/<Layout\b[^>]*\bwidth=\{(\d+)\}/gs) ?? [], match => ({
          key,
          width: Number(match[1]),
        })),
      )
      .filter(({ width }) => width > 400);

    expect(widerThanPreferred.filter(({ width }) => width > 600)).toEqual([]);
    expect(widerThanPreferred.filter(({ key, width }) => !validatedWiderLayouts.has(`${key}:${width}`))).toEqual([]);
  });

  it('Scope transform playground 只显示当前 kind 对应参数，且中英文条件一致', () => {
    const segments = ['kernel', 'components', 'layout', 'scope'];
    const zhDefinition = resolvePreviewControls(controlModules[buildControlsKey(segments, 'scope-translate-basic')]);
    const enDefinition = resolvePreviewControls(
      controlModules[buildLangControlsKey(segments, 'scope-translate-basic', 'en')],
    );
    expect(zhDefinition?.presentation).toBe('panel');
    expect(enDefinition?.presentation).toBe('panel');

    const conditionContractOf = (definition: typeof zhDefinition) =>
      definition?.presentation === 'panel'
        ? definition.sections.flatMap(section =>
            section.controls.map(field => ({ id: field.id, visibleWhen: field.visibleWhen })),
          )
        : [];
    expect(conditionContractOf(zhDefinition)).toEqual(conditionContractOf(enDefinition));

    const visibleFieldIds = (definition: typeof zhDefinition, transformKind: string) =>
      definition?.presentation === 'panel'
        ? resolveVisiblePreviewControlSections(definition.sections, { transformKind }).flatMap(section =>
            section.controls.map(field => field.id),
          )
        : [];

    expect(visibleFieldIds(zhDefinition, 'translate')).toEqual(['transformKind', 'translateX', 'translateY']);
    expect(visibleFieldIds(zhDefinition, 'polar-translate')).toEqual([
      'transformKind',
      'referent',
      'polarAngle',
      'distance',
    ]);
    expect(visibleFieldIds(zhDefinition, 'at-translate')).toEqual([
      'transformKind',
      'referent',
      'distance',
      'direction',
    ]);
    expect(visibleFieldIds(zhDefinition, 'offset-translate')).toEqual([
      'transformKind',
      'referent',
      'offsetX',
      'offsetY',
    ]);
    expect(visibleFieldIds(zhDefinition, 'between-translate')).toEqual(['transformKind', 'fraction']);
    expect(visibleFieldIds(zhDefinition, 'rotate')).toEqual([
      'transformKind',
      'rotateDegrees',
      'rotateCenterX',
      'rotateCenterY',
    ]);
    expect(visibleFieldIds(zhDefinition, 'scale')).toEqual(['transformKind', 'scaleX', 'scaleY']);
  });
});
