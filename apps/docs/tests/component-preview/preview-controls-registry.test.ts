import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  AlignKey,
  ComponentPreviewCardProps,
  ComponentPreviewFiles,
  ComponentPreviewProps,
  ComponentRenderSource,
  DiffLineKind,
  PreviewActionSlot,
  PreviewControlField,
  PreviewControlPlacement,
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
  buildControlsKey,
  buildLangControlsKey,
  buildSourceFileKey,
  controlModules,
  demoModules,
  resolveControlsKey,
  resolveDemoKey,
  resolvePreviewControls,
} from '../../src/modules/docs/components/component-preview/registry';
import {
  buildPreviewIR,
  buildReactSourceFiles,
  formatIR,
  irToVanillaCode,
} from '../../src/modules/docs/components/component-preview/utils';

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
    }>();
  });

  it('从 registry owner 暴露本地化 controls key resolver', () => {
    expect(resolveControlsKey).toBeTypeOf('function');
  });

  it('registry helper 不通过组件预览根 barrel 转发', () => {
    expect(buildControlsKey).toBeTypeOf('function');
    expect(controlModules).toBeTypeOf('object');
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

    expect(demoModules[key]?.previewSource).toEqual({ deriveIR: false });
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
      'text',
      'shape',
      'fill',
      'stroke',
      'strokeWidth',
      'dashed',
      'opacity',
    ]);
  });
});
