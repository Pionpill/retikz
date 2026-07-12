import type { FC } from 'react';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { docPathSegments, useDocLocation } from '@/modules/docs/layout';

import type {
  AlignKey,
  ComponentPreviewFiles,
  PreviewActionSlot,
  PreviewControlConfig,
  PreviewControlSlot,
  SizeKey,
} from './types';

import { ComponentPreviewCard } from './ComponentPreviewCard';
import { useDemoLocationContext } from './context';
import { buildAnimationControlSlots } from './controls';
import { buildConfiguredControlSlots } from './preview-panel';
import {
  buildIrJsonKey,
  buildVanillaKey,
  controlModules,
  demoModules,
  demoSources,
  irJsonOverrides,
  resolveControlsKey,
  resolveDemoKey,
  resolvePreviewControls,
  vanillaModules,
  vanillaOverrides,
} from './registry';
import { buildPreviewSource } from './source-panel';
import { irHasAnimations, normalizeComponentPreviewFiles } from './utils';

export type ComponentPreviewProps = {
  /** 主 demo 与附加源码文件；主 demo id 不含 `.demo.tsx` 后缀。 */
  files: ComponentPreviewFiles;
  /** 复用同目录下另一 demo 的 controls；默认与主 demo 相同。 */
  controlsName?: string;
  /** 渲染区垂直对齐，默认 center */
  align?: AlignKey;
  /** 渲染区高度档位，默认 `md`。 */
  size?: SizeKey;
  /** 透传给 demo 渲染区父级 div 的 className，可覆盖默认高度 / p-10 / 居中等。 */
  previewClassName?: string;
  /** 隐藏底部“View Code / 源码 / IR”面板与 Dialog 右侧栏，只保留 demo 渲染区。 */
  hideCode?: boolean;
  /** 强制显示 / 隐藏内置动画工具；省略时自动判定。 */
  replayable?: boolean;
  /** 自定义预览控制定义，优先于 demo 模块声明控件，并分别针对每个面板 runtime 求值。 */
  controlSlots?: Array<PreviewControlSlot>;
  /** 自定义预览控件层是否常驻显示；默认 true。 */
  controlsAlwaysVisible?: boolean;
  /** 全屏弹窗 header 动作定义，使用弹窗自己的 runtime 求值。 */
  dialogActionSlots?: Array<PreviewActionSlot>;
};

/** MDX 内的演示卡入口。 */
export const ComponentPreview: FC<ComponentPreviewProps> = props => {
  const {
    files,
    controlsName,
    align = 'center',
    size = 'md',
    previewClassName,
    hideCode = false,
    replayable,
    controlSlots,
    controlsAlwaysVisible = true,
    dialogActionSlots,
  } = props;
  const { name, diffFrom, sourceFiles } = useMemo(() => normalizeComponentPreviewFiles(files), [files]);
  const loc = useDocLocation();
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';

  const ctxSegments = useDemoLocationContext();
  const segments = useMemo(() => ctxSegments ?? (loc ? docPathSegments(loc) : null), [ctxSegments, loc]);
  const key = segments ? resolveDemoKey(segments, name, lang) : null;
  const mod = key ? demoModules[key] : undefined;
  const rawSource = key ? demoSources[key] : undefined;
  const Component = mod?.default;
  const controlKey = segments ? resolveControlsKey(segments, controlsName ?? name, lang) : null;
  const controlModule = controlKey ? controlModules[controlKey] : undefined;
  const moduleControls = mod?.previewControls ?? resolvePreviewControls(controlModule);
  const baselineKey = segments && diffFrom ? resolveDemoKey(segments, diffFrom, lang) : null;
  const baselineRawSource = baselineKey ? demoSources[baselineKey] : undefined;

  const irJsonOverrideKey = segments ? buildIrJsonKey(segments, name) : null;
  const irJsonOverride = irJsonOverrideKey ? irJsonOverrides[irJsonOverrideKey] : undefined;
  const vanillaKey = segments ? buildVanillaKey(segments, name) : null;
  const vanillaOverride = vanillaKey ? vanillaOverrides[vanillaKey] : undefined;
  const vanillaModule = vanillaKey ? vanillaModules[vanillaKey] : undefined;
  const vanillaSvg = typeof vanillaModule?.svg === 'string' ? vanillaModule.svg : undefined;
  const previewSource = mod?.previewSource;
  const exportedPreviewIR = mod?.previewIR;
  const sourceResult = useMemo(
    () =>
      Component && key && segments && rawSource !== undefined
        ? buildPreviewSource({
            Component,
            previewSource,
            name,
            key,
            segments,
            rawSource,
            sourceFiles,
            diffFrom,
            baselineRawSource,
            hideCode,
            irJsonOverride,
            exportedPreviewIR,
            vanillaOverride,
            vanillaSvg,
          })
        : { source: undefined, previewIr: null },
    [
      Component,
      previewSource,
      name,
      key,
      segments,
      rawSource,
      sourceFiles,
      diffFrom,
      baselineRawSource,
      hideCode,
      irJsonOverride,
      exportedPreviewIR,
      vanillaOverride,
      vanillaSvg,
    ],
  );

  if (!loc) return null;
  if (!segments) return null;

  if (!mod || rawSource == null || !key || !Component) {
    return (
      <div className="my-6 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Demo <code className="rounded bg-muted px-1">{name}</code> not found at{' '}
        <code className="rounded bg-muted px-1">{key ?? '(unknown)'}</code>
      </div>
    );
  }

  const previewIr = sourceResult.previewIr;
  const animated = replayable ?? (previewIr !== null && irHasAnimations(previewIr.ir));
  const controlConfigs = moduleControls?.filter((control): control is PreviewControlConfig => 'kind' in control) ?? [];
  const moduleControlSlots =
    moduleControls?.filter((control): control is PreviewControlSlot => 'render' in control) ?? [];
  const configuredControlSlots = buildConfiguredControlSlots(controlConfigs);
  const contentControlSlots = controlSlots ?? [...configuredControlSlots, ...moduleControlSlots];
  const resolvedControlSlots = [...(animated ? buildAnimationControlSlots() : []), ...contentControlSlots];

  return (
    <ComponentPreviewCard
      name={name}
      Component={Component}
      source={sourceResult.source}
      align={align}
      size={size}
      previewClassName={previewClassName}
      controlSlots={resolvedControlSlots}
      controlsAlwaysVisible={controlsAlwaysVisible && contentControlSlots.length > 0}
      dialogActionSlots={dialogActionSlots}
    />
  );
};
