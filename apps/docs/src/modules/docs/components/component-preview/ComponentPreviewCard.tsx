import type { FC, ReactNode } from 'react';

import { useCallback, useRef, useState } from 'react';

import { cn } from '@/lib';
import { useAiChatStore } from '@/modules/docs/ai-chat';
import { useComponentPreviewStore } from '@/modules/docs/store';

import type {
  AlignKey,
  ComponentRenderSource,
  PreviewActionSlot,
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewControlSlot,
  PreviewThemeMode,
  SizeKey,
} from './types';

import { ComponentPreviewDialog } from './ComponentPreviewDialog';
import { alignClass, sizeClass } from './constants';
import { PreviewWorkspace } from './control-panel';
import { mergePreviewControlSlots } from './controls';
import { usePreviewControlState } from './hooks';
import { buildPreviewToolSlots, usePreviewPanelState } from './preview-panel';
import { InlineSourcePanel, useSourcePanelState } from './source-panel';
import { buildAskAiPrompt, findPrecedingHeading, resolvePreviewCodeVisible } from './utils';

export type { ComponentRenderSource } from './types';

export type ComponentPreviewCardProps = {
  /** demo 标识，仅用于 Dialog header 显示。 */
  name: string;
  Component: FC;
  /** 代码区视图集合；缺省时整段代码面板与 Dialog 右栏都不渲染。 */
  source?: ComponentRenderSource;
  /** React 源码视图默认选中的文件名。 */
  defaultSourceFile?: string;
  /** 渲染区垂直对齐，默认 center。 */
  align?: AlignKey;
  /** 渲染区高度档位，默认 `md`。 */
  size?: SizeKey;
  /** 透传给 demo 渲染区父级 div 的 className。 */
  previewClassName?: string;
  /** 是否显示右侧工具栏的 Ask AI 按钮。 */
  showAskAi?: boolean;
  /** 当前 demo 的声明式 controls definition */
  controlDefinition?: PreviewControlsDefinition;
  /** 当前 demo 的完整 controls contract */
  controlContract?: PreviewControlContract;
  /** 是否显示预览上下文栏；缺省时随源码面板可用性决定 */
  showContextBar?: boolean;
  /** 分别针对卡片与弹窗面板 runtime 求值的预览控制定义。 */
  controlSlots?: Array<PreviewControlSlot>;
  /** 分别针对弹窗 runtime 求值的全屏 header 动作定义。 */
  dialogActions?: Array<PreviewActionSlot>;
  /** 紧跟在卡片正下方的读图或操作说明。 */
  caption?: ReactNode;
};

/** 演示卡核心。 */
export const ComponentPreviewCard: FC<ComponentPreviewCardProps> = props => {
  const {
    name,
    Component,
    source,
    defaultSourceFile,
    align = 'center',
    size = 'md',
    previewClassName,
    showAskAi = true,
    controlDefinition,
    controlContract,
    showContextBar = source !== undefined,
    controlSlots,
    dialogActions,
    caption,
  } = props;
  const [localIsCodeVisible, setLocalIsCodeVisible] = useState<boolean | undefined>(undefined);
  const [localIsExpanded, setLocalIsExpanded] = useState<boolean | undefined>(undefined);
  const [localControlPanelOpen, setLocalControlPanelOpen] = useState<boolean>();
  const [themeMode, setThemeMode] = useState<PreviewThemeMode>(() => useComponentPreviewStore.getState().themeMode);
  const sourceState = useSourcePanelState(source, defaultSourceFile);
  const hasCode = sourceState.views.length > 0;
  const [isMaximized, setIsMaximized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const setAiOpen = useAiChatStore(s => s.setOpen);
  const fillAiDraft = useAiChatStore(s => s.fillDraftAndFocus);
  const aiCurrentPage = useAiChatStore(s => s.currentPage);

  const globalHideCode = useComponentPreviewStore(s => s.hideCode);
  const globalIsExpand = useComponentPreviewStore(s => s.isExpand);
  const globalDragEnabled = useComponentPreviewStore(s => s.dragEnabled);
  const globalRendererMode = useComponentPreviewStore(s => s.rendererMode);
  const globalControlPanelDefaultOpen = useComponentPreviewStore(s => s.controlPanelDefaultOpen);
  const globalRangePlaybackDuration = useComponentPreviewStore(s => s.rangePlaybackDuration);
  const resolvedControlDefinition = controlContract?.controls ?? controlDefinition;
  const controlState = usePreviewControlState(
    resolvedControlDefinition,
    controlContract?.canonicalValues,
    globalRangePlaybackDuration,
  );
  const previewState = usePreviewPanelState({
    controlState,
    rendererMode: globalRendererMode,
    rendererModeOverride: sourceState.activeRendererMode,
    size,
    dragEnabled: globalDragEnabled,
    expanded: isMaximized,
  });
  const isCodeVisible = resolvePreviewCodeVisible(globalHideCode, localIsCodeVisible);
  const isExpanded = localIsExpanded ?? globalIsExpand;
  const controlPanelOpen = localControlPanelOpen ?? globalControlPanelDefaultOpen;

  const handleHideAll = useCallback(() => {
    setLocalIsCodeVisible(false);
    setLocalIsExpanded(false);
    sourceState.setView('react');
  }, [sourceState]);

  const handleAskAi = useCallback(() => {
    const heading = findPrecedingHeading(containerRef.current);
    const lang = aiCurrentPage?.lang ?? 'zh';
    const pageTitle = aiCurrentPage?.title ?? '';
    const headingText = (heading?.textContent ?? '').trim();
    const prompt = buildAskAiPrompt(lang, pageTitle, headingText, name);
    setAiOpen(true);
    fillAiDraft(prompt);
  }, [aiCurrentPage, fillAiDraft, name, setAiOpen]);
  const handleShowCode = useCallback(() => setLocalIsCodeVisible(true), []);

  const previewToolSlots = buildPreviewToolSlots({
    transform: previewState.transform,
    isTransformed: previewState.isTransformed,
    panBy: previewState.panBy,
    zoomBy: previewState.zoomBy,
    resetTransform: previewState.resetTransform,
    dragEnabled: previewState.dragEnabled,
    toggleDrag: previewState.toggleDrag,
    onMaximize: () => setIsMaximized(true),
    size: previewState.size,
    onSizeChange: previewState.setSize,
    name,
    rendererMode: previewState.rendererMode,
    rendererModeFixed: previewState.rendererModeFixed,
    toggleRendererMode: previewState.toggleRendererMode,
  });
  const resolvedCardControlSlots = mergePreviewControlSlots(controlSlots, previewToolSlots);

  return (
    <div ref={containerRef} className="my-6">
      <div className="overflow-hidden rounded-xl border">
        <PreviewWorkspace
          definition={resolvedControlDefinition}
          controlContract={controlContract}
          controlState={controlState}
          showContextBar={showContextBar}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          controlPanelOpen={controlPanelOpen}
          controlDensity="compact"
          onControlPanelOpenChange={setLocalControlPanelOpen}
          workspaceClassName={sizeClass[previewState.size]}
          previewState={previewState}
          Component={Component}
          activeRender={sourceState.activeRender}
          controlSlots={resolvedCardControlSlots}
          previewClassName={cn(
            'flex h-full w-full justify-center overflow-hidden p-6 select-none sm:p-10',
            alignClass[align],
            previewClassName,
          )}
        />
        {hasCode ? (
          <InlineSourcePanel
            state={sourceState}
            isCodeVisible={isCodeVisible}
            showAskAi={showAskAi}
            onAskAi={handleAskAi}
            isExpanded={isExpanded}
            onExpandedChange={setLocalIsExpanded}
            onHideSource={handleHideAll}
            onShowCode={handleShowCode}
          />
        ) : null}
        {isMaximized ? (
          <ComponentPreviewDialog
            name={name}
            Component={Component}
            source={source}
            defaultSourceFile={defaultSourceFile}
            align={align}
            initialSize={size}
            controlState={controlState}
            controlDefinition={resolvedControlDefinition}
            controlContract={controlContract}
            showContextBar={showContextBar}
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
            controlPanelOpen={controlPanelOpen}
            onControlPanelOpenChange={setLocalControlPanelOpen}
            controlSlots={controlSlots}
            dialogActions={dialogActions}
            showAskAi={showAskAi}
            onClose={() => setIsMaximized(false)}
          />
        ) : null}
      </div>
      {caption ? (
        <p data-slot="component-preview-caption" className="mt-2 text-sm text-muted-foreground">
          {caption}
        </p>
      ) : null}
    </div>
  );
};
