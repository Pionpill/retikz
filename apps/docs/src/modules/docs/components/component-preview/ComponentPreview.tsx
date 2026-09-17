import type { FC, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import { cn } from '@/lib';
import { docPathSegments, useDocLocation } from '@/modules/docs/layout';

import { ComponentPreviewCard } from './ComponentPreviewCard';
import { sizeClass } from './constants';
import { useDemoLocationContext } from './context';
import { mergePreviewControlSlots, resolveBuiltinControlSlots } from './controls';
import { usePreviewResources } from './hooks';
import { buildConfiguredControlSlots } from './preview-panel';
import { resolvePreviewControlContract } from './registry';
import { buildPreviewSource } from './source-panel';
import { isPreviewThemeStyleDocument, PreviewThemeStyle, usePreviewTheme } from './theme';
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
import { normalizeComponentPreviewFiles } from './utils';

export type ComponentPreviewProps = {
  /** 主 demo 与附加源码文件；主 demo id 不含后缀，以 / 开头时相对 contents 根目录，其余相对当前页面 */
  files: ComponentPreviewFiles;
  /** React 源码视图默认选中的附加文件；缺省显示主 demo。 */
  defaultSourceFile?: string;
  /** 预览控制能力与局部插槽。 */
  controls?: PreviewControlsOptions;
  /** 属性面板是否默认打开；缺省时跟随 docs 全局设置 */
  controlPanelDefaultOpen?: boolean;
  /** 属性面板的默认尺寸百分比。桌面端为宽度，窄屏时等比作为高度
   * @default 25
   */
  controlPanelDefaultSize?: number;
  /** 全屏弹窗 header 动作。 */
  dialogActions?: Array<PreviewActionSlot>;
  /** 渲染区垂直对齐，默认 center */
  align?: AlignKey;
  /** 渲染区高度档位，默认 `md`。 */
  size?: SizeKey;
  /** 透传给 demo 渲染区父级 div 的 className，可覆盖默认高度 / p-5 / 居中等。 */
  previewClassName?: string;
  /** 默认隐藏底部源码区，并在预览左下角提供展开源码的入口。 */
  hideCode?: boolean;
  /** 是否显示缩放、下载、渲染器等预览宿主工具栏，默认显示。 */
  showTools?: boolean;
  /** 紧跟在预览卡正下方的读图或操作说明。 */
  caption?: ReactNode;
};

/** MDX 内的演示卡入口。 */
export const ComponentPreview: FC<ComponentPreviewProps> = props => {
  const {
    files,
    defaultSourceFile,
    controls,
    controlPanelDefaultOpen,
    controlPanelDefaultSize,
    dialogActions,
    align = 'center',
    size = 'md',
    previewClassName,
    hideCode = false,
    showTools = true,
    caption,
  } = props;
  const [themeStyleSelection, setThemeStyleSelection] = useState<PreviewThemeStyleSelection>('inherit');
  const controlOptions = controls ?? {};
  const { name, diffFrom, sourceFiles } = useMemo(() => normalizeComponentPreviewFiles(files), [files]);
  const loc = useDocLocation();
  const { i18n } = useTranslation();
  const lang: Lang = (i18n.resolvedLanguage ?? 'zh').startsWith('zh') ? 'zh' : 'en';

  const ctxSegments = useDemoLocationContext();
  const segments = useMemo(() => ctxSegments ?? (loc ? docPathSegments(loc) : null), [ctxSegments, loc]);
  const isSchematicPreview = segments?.[0] === 'schematic' || name.startsWith('/schematic/');
  const enableThemeSwitch = !isSchematicPreview && isPreviewThemeStyleDocument(segments?.[0]);
  const effectiveThemeStyleSelection = enableThemeSwitch ? themeStyleSelection : PreviewThemeStyle.Default;
  const previewTheme = usePreviewTheme(effectiveThemeStyleSelection);
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
      ? (resolvePreviewControlContract(controlModule, lang) ?? resolvePreviewControlContract(mod, lang))
      : resolvePreviewControlContract(controlModule, lang);
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
            hideCode: false,
            irJsonOverride,
            exportedPreviewIR,
            vanillaOverride,
            vanillaSvg,
            theme: previewTheme,
            lang,
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
      irJsonOverride,
      exportedPreviewIR,
      vanillaOverride,
      vanillaSvg,
      previewTheme,
      lang,
    ],
  );

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
      lang={lang}
      source={sourceResult.source}
      buildSourceViews={
        previewSource?.buildViews === undefined
          ? undefined
          : values => previewSource.buildViews!({ lang, theme: previewTheme, values })
      }
      defaultSourceFile={defaultSourceFile}
      align={align}
      size={size}
      previewClassName={previewClassName}
      codeInitiallyHidden={hideCode}
      showTools={showTools}
      controlContract={controlContract}
      controlDefinition={controlDefinition}
      controlPanelDefaultOpen={controlPanelDefaultOpen}
      controlPanelDefaultSize={controlPanelDefaultSize}
      controlSlots={resolvedControlSlots}
      dialogActions={dialogActions}
      enableThemeSwitch={enableThemeSwitch}
      themeStyleSelection={effectiveThemeStyleSelection}
      onThemeStyleChange={setThemeStyleSelection}
      caption={caption}
    />
  );
};
