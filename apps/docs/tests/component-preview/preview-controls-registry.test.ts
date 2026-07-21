import type { CompiledNodeLayout, IRScene, TextMeasurer } from '@retikz/core';
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
  PreviewControlValuesFor,
  PreviewControlVisibility,
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
const controlFieldContractOf = (field: PreviewControlField) => ({
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
});

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
    expect(buildControlsKey(['viz', 'grammar', 'mark', 'path'], 'line-curve')).toBe(
      '../../contents/viz/grammar/mark/path/line-curve.controls.ts',
    );
    expect(buildControlsKey(['viz', 'grammar', 'mark', 'path'], 'line-closure')).toBe(
      '../../contents/viz/grammar/mark/path/line-closure.controls.ts',
    );
    expect(buildControlsKey(['viz', 'grammar', 'mark', 'path'], 'line-stack-area')).toBe(
      '../../contents/viz/grammar/mark/path/line-stack-area.controls.ts',
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
    const key = resolveDemoKey(['viz', 'grammar', 'mark', 'path'], 'line-curve', 'zh');

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
    const segments = ['viz', 'grammar', 'mark', 'path'];
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
    const segments = ['viz', 'grammar', 'mark', 'path'];

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
        ? definition.sections.flatMap(section =>
            section.controls.map(field => ({
              id: field.id,
              kind: field.kind,
              defaultValue: field.defaultValue,
              optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
            })),
          )
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
      const fields =
        definition.presentation === 'panel'
          ? definition.sections.flatMap(section =>
              section.controls.map(field => ({ field, sectionVisibleWhen: section.visibleWhen })),
            )
          : definition.controls.map(field => ({ field, sectionVisibleWhen: undefined }));

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
      return definition.sections.flatMap(section =>
        section.controls.map(field => ({
          id: field.id,
          label: field.label,
          defaultValue: field.defaultValue,
          min: field.kind === 'range' ? field.min : undefined,
          max: field.kind === 'range' ? field.max : undefined,
          step: field.kind === 'range' ? field.step : undefined,
        })),
      );
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
      return definition.sections.flatMap(section =>
        section.controls.map(field => ({
          id: field.id,
          defaultValue: field.defaultValue,
          min: field.kind === 'range' ? field.min : undefined,
          max: field.kind === 'range' ? field.max : undefined,
          step: field.kind === 'range' ? field.step : undefined,
        })),
      );
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
      return definition.sections.flatMap(section =>
        section.controls.map(field => ({
          id: field.id,
          defaultValue: field.defaultValue,
          optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
        })),
      );
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
      definition.sections.flatMap(section => section.controls.map(field => [field.id, field.defaultValue])),
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
      const content = definition.sections.flatMap(section => section.controls).find(field => field.id === 'content');
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
