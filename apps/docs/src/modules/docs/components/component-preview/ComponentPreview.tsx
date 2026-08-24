import type { FC, ReactNode } from 'react';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib';
import { docPathSegments, useDocLocation } from '@/modules/docs/layout';

import type {
  AlignKey,
  ComponentPreviewFiles,
  PreviewActionSlot,
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewControlsOptions,
  PreviewThemeStyleSelection,
  SizeKey,
} from './types';

import { ComponentPreviewCard } from './ComponentPreviewCard';
import { sizeClass } from './constants';
import { useDemoLocationContext } from './context';
import { mergePreviewControlSlots, resolveBuiltinControlSlots } from './controls';
import { usePreviewResources } from './hooks';
import { buildConfiguredControlSlots } from './preview-panel';
import { resolvePreviewControlContract } from './registry';
import { buildPreviewSource } from './source-panel';
import { isPreviewThemeStyleDocument, usePreviewTheme } from './theme';
import { normalizeComponentPreviewFiles } from './utils';

export type ComponentPreviewProps = {
  /** 主 demo 与附加源码文件；主 demo id 不含 `.demo.tsx` 后缀。 */
  files: ComponentPreviewFiles;
  /** React 源码视图默认选中的附加文件；缺省显示主 demo。 */
  defaultSourceFile?: string;
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
  /** 紧跟在预览卡正下方的读图或操作说明。 */
  caption?: ReactNode;
};

/** MDX 内的演示卡入口。 */
export const ComponentPreview: FC<ComponentPreviewProps> = props => {
  const {
    files,
    defaultSourceFile,
    controls,
    dialogActions,
    align = 'center',
    size = 'md',
    previewClassName,
    hideCode = false,
    caption,
  } = props;
  const [themeStyleSelection, setThemeStyleSelection] = useState<PreviewThemeStyleSelection>('inherit');
  const controlOptions = controls ?? {};
  const { name, diffFrom, sourceFiles } = useMemo(() => normalizeComponentPreviewFiles(files), [files]);
  const loc = useDocLocation();
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en';
  const previewTheme = usePreviewTheme(themeStyleSelection);

  const ctxSegments = useDemoLocationContext();
  const segments = useMemo(() => ctxSegments ?? (loc ? docPathSegments(loc) : null), [ctxSegments, loc]);
  const enableThemeSwitch = isPreviewThemeStyleDocument(segments?.[0], segments?.[1]);
  const controlsDisabled = controlOptions.name === false;
  const explicitControlsName = typeof controlOptions.name === 'string' ? controlOptions.name : null;
  const resourceRequest = useMemo(
    () =>
      segments === null
        ? null
        : {
            segments,
            name,
            lang,
            controlName: typeof controlOptions.name === 'string' ? controlOptions.name : null,
            controlsDisabled: controlOptions.name === false,
            sourceFiles,
            diffFrom,
          },
    [controlOptions.name, diffFrom, lang, name, segments, sourceFiles],
  );
  const resourcesState = usePreviewResources(resourceRequest);
  const resources = resourcesState.status === 'ready' ? resourcesState.resources : undefined;
  const mod = resources?.module;
  const rawSource = resources?.rawSource;
  const Component = mod?.default;
  const controlModule = resources?.controlModule;
  const controlContract: PreviewControlContract | undefined = controlsDisabled
    ? undefined
    : explicitControlsName === null
      ? (resolvePreviewControlContract(controlModule) ?? resolvePreviewControlContract(mod))
      : resolvePreviewControlContract(controlModule);
  const controlDefinition: PreviewControlsDefinition | undefined = controlContract?.controls;
  const baselineRawSource = resources?.baselineRawSource;
  const irJsonOverride = resources?.irJsonOverride;
  const vanillaOverride = resources?.vanillaOverride;
  const vanillaModule = resources?.vanillaModule;
  const vanillaSvg = typeof vanillaModule?.svg === 'string' ? vanillaModule.svg : undefined;
  const previewSource = mod?.previewSource;
  const exportedPreviewIR = mod?.previewIR;
  const sourceResult = useMemo(
    () =>
      Component && resourcesState.status === 'ready' && segments && rawSource !== undefined
        ? buildPreviewSource({
            Component,
            previewSource,
            name,
            key: resourcesState.key,
            segments,
            rawSource,
            sourceFiles,
            diffFrom,
            baselineRawSource,
            sourceContents: resourcesState.resources.sourceContents,
            hideCode,
            irJsonOverride,
            exportedPreviewIR,
            vanillaOverride,
            vanillaSvg,
            theme: previewTheme,
          })
        : { source: undefined, previewIr: null },
    [
      Component,
      previewSource,
      name,
      resourcesState,
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
      previewTheme,
    ],
  );

  if (!loc) return null;
  if (!segments) return null;

  if (resourcesState.status === 'idle') return null;

  if (resourcesState.status === 'missing') {
    return (
      <div className="my-6">
        <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Demo <code className="rounded bg-muted px-1">{name}</code> not found at{' '}
          <code className="rounded bg-muted px-1">{resourcesState.key}</code>
        </div>
        {caption ? (
          <p data-slot="component-preview-caption" className="mt-2 text-sm text-muted-foreground">
            {caption}
          </p>
        ) : null}
      </div>
    );
  }

  if (resourcesState.status === 'loading') {
    return (
      <div className="my-6">
        <div
          data-slot="component-preview-loading"
          className={cn('animate-pulse rounded-xl border bg-muted/30', sizeClass[size])}
          aria-hidden
        />
        {caption ? (
          <p data-slot="component-preview-caption" className="mt-2 text-sm text-muted-foreground">
            {caption}
          </p>
        ) : null}
      </div>
    );
  }

  if (resourcesState.status === 'error') {
    return (
      <div className="my-6 rounded-md border border-destructive/40 px-4 py-3 text-sm text-destructive">
        Failed to load demo <code>{name}</code> at <code>{resourcesState.key}</code>: {resourcesState.message}
      </div>
    );
  }

  if (!mod || rawSource == null || !Component) return null;

  const configuredControlSlots =
    controlDefinition?.presentation === 'overlay' ? buildConfiguredControlSlots(controlDefinition.controls) : [];
  const builtinControlSlots = resolveBuiltinControlSlots({
    previewIr: sourceResult.previewIr,
    options: controlOptions,
  });
  const resolvedControlSlots = mergePreviewControlSlots(
    builtinControlSlots,
    configuredControlSlots,
    controlDefinition?.slots,
    controlOptions.slots,
  );

  return (
    <ComponentPreviewCard
      name={name}
      Component={Component}
      source={sourceResult.source}
      defaultSourceFile={defaultSourceFile}
      align={align}
      size={size}
      previewClassName={previewClassName}
      controlContract={controlContract}
      controlDefinition={controlDefinition}
      controlSlots={resolvedControlSlots}
      dialogActions={dialogActions}
      enableThemeSwitch={enableThemeSwitch}
      themeStyleSelection={themeStyleSelection}
      onThemeStyleChange={setThemeStyleSelection}
      caption={caption}
    />
  );
};
