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
  PreviewControlsOptions,
  SizeKey,
} from './types';

import { ComponentPreviewCard } from './ComponentPreviewCard';
import { useDemoLocationContext } from './context';
import { mergePreviewControlSlots, resolveBuiltinControlSlots } from './controls';
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
  resolvePreviewControlContract,
  resolvePreviewControls,
  vanillaModules,
  vanillaOverrides,
} from './registry';
import { buildPreviewSource } from './source-panel';
import { normalizeComponentPreviewFiles } from './utils';

export type ComponentPreviewProps = {
  /** 主 demo 与附加源码文件；主 demo id 不含 `.demo.tsx` 后缀。 */
  files: ComponentPreviewFiles;
  /** 预览控制能力与局部插槽。 */
  controls?: PreviewControlsOptions;
  /** 全屏弹窗 header 动作。 */
  dialogActions?: Array<PreviewActionSlot>;
  /** 渲染区垂直对齐，默认 center */
  align?: AlignKey;
  /** 渲染区高度档位，默认 `md`。 */
  size?: SizeKey;
  /** 透传给 demo 渲染区父级 div 的 className，可覆盖默认高度 / p-10 / 居中等。 */
  previewClassName?: string;
  /** 隐藏底部“View Code / 源码 / IR”面板与 Dialog 右侧栏，只保留 demo 渲染区。 */
  hideCode?: boolean;
};

/** MDX 内的演示卡入口。 */
export const ComponentPreview: FC<ComponentPreviewProps> = props => {
  const { files, controls, dialogActions, align = 'center', size = 'md', previewClassName, hideCode = false } = props;
  const controlOptions = controls ?? {};
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
  const controlsDisabled = controlOptions.name === false;
  const explicitControlsName = typeof controlOptions.name === 'string' ? controlOptions.name : null;
  const controlKey =
    segments && !controlsDisabled ? resolveControlsKey(segments, explicitControlsName ?? name, lang) : null;
  const controlModule = controlKey ? controlModules[controlKey] : undefined;
  const demoControlContract = mod?.previewControlContract
    ? resolvePreviewControlContract({ previewControlContract: mod.previewControlContract })
    : undefined;
  const moduleControls = controlsDisabled
    ? undefined
    : explicitControlsName === null
      ? (demoControlContract?.controls ?? mod?.previewControls ?? resolvePreviewControls(controlModule))
      : resolvePreviewControls(controlModule);
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

  const controlConfigs = moduleControls?.filter((control): control is PreviewControlConfig => 'kind' in control) ?? [];
  const moduleControlSlots =
    moduleControls?.filter((control): control is PreviewControlSlot => 'render' in control) ?? [];
  const configuredControlSlots = buildConfiguredControlSlots(controlConfigs);
  const builtinControlSlots = resolveBuiltinControlSlots({
    previewIr: sourceResult.previewIr,
    options: controlOptions,
  });
  const resolvedControlSlots = mergePreviewControlSlots(
    builtinControlSlots,
    configuredControlSlots,
    moduleControlSlots,
    controlOptions.slots,
  );

  return (
    <ComponentPreviewCard
      name={name}
      Component={Component}
      source={sourceResult.source}
      align={align}
      size={size}
      previewClassName={previewClassName}
      controlSlots={resolvedControlSlots}
      dialogActions={dialogActions}
    />
  );
};
