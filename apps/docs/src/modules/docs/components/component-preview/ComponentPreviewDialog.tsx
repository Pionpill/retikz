import type { CSSProperties, FC } from 'react';

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Download,
  Hand,
  RotateCcw,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useState } from 'react';

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
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
  PreviewControlState,
  PreviewThemeMode,
  PreviewThemeStyleSelection,
  SizeKey,
} from './types';

import { ToolbarIconButton } from './components';
import { alignClass } from './constants';
import { PreviewResizeHandle, PreviewWorkspace } from './control-panel';
import { mergePreviewControlSlots } from './controls';
import {
  downloadPreviewImage,
  PAN_STEP,
  PreviewToolbar,
  PreviewToolbarButton,
  RendererModeButton,
  usePreviewPanelState,
  ZOOM_FACTOR,
} from './preview-panel';
import { SourcePanel, useSourcePanelState } from './source-panel';
import { buildAskAiPrompt } from './utils';

export type ComponentPreviewDialogProps = {
  /** demo 文件名，用于 header 标识与下载文件名。 */
  name: string;
  /** 默认 React demo 组件。 */
  Component: FC;
  /** 不可变源码视图定义；缺省时预览区占满弹窗。 */
  source?: ComponentRenderSource;
  /** React 源码视图默认选中的文件名。 */
  defaultSourceFile?: string;
  /** 预览内容垂直对齐方式。 */
  align: AlignKey;
  /** 从 ComponentPreview 原始配置初始化，不读取 card controller 当前 size。 */
  initialSize: SizeKey;
  /** 与所属 Card 双向共享的业务控件状态 */
  controlState: PreviewControlState;
  /** 与所属 Card 共享的声明式 controls definition */
  controlDefinition?: PreviewControlsDefinition;
  /** 与所属 Card 共享的完整 controls contract */
  controlContract?: PreviewControlContract;
  /** 是否显示预览上下文栏 */
  showContextBar: boolean;
  /** 与所属 Card 共享的局部主题 */
  themeMode: PreviewThemeMode;
  /** 更新 Card/Dialog 共享的局部主题 */
  onThemeModeChange: (themeMode: PreviewThemeMode) => void;
  /** 是否显示单预览 ThemeStyle 切换器。 */
  enableThemeSwitch?: boolean;
  /** 当前预览实际生效的 ThemeStyle。 */
  /** 当前单预览 ThemeStyle 选择。 */
  themeStyleSelection?: PreviewThemeStyleSelection;
  /** 更新当前单预览 ThemeStyle 选择。 */
  onThemeStyleChange?: (themeStyle: PreviewThemeStyleSelection) => void;
  /** 与所属 Card 共享的属性面板打开状态 */
  controlPanelOpen: boolean;
  /** 更新 Card/Dialog 共享的属性面板打开状态 */
  onControlPanelOpenChange: (open: boolean) => void;
  /** 针对弹窗独立 runtime 求值的预览控制定义。 */
  controlSlots?: Array<PreviewControlSlot>;
  /** 针对弹窗独立 runtime 求值的 header 动作定义。 */
  dialogActions?: Array<PreviewActionSlot>;
  /** 是否展示源码 header 的 Ask AI 动作。 */
  showAskAi?: boolean;
  /** 关闭并卸载弹窗。 */
  onClose: () => void;
};

const DOT_PATTERN_STYLE: CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, color-mix(in oklab, var(--foreground) 15%, transparent) 1px, transparent 1px)',
  backgroundSize: '14px 14px',
};

/** 构建只属于全屏预览区的平移、缩放与拖拽工具。 */
const buildDialogPreviewToolSlots = (state: ReturnType<typeof usePreviewPanelState>): Array<PreviewControlSlot> => [
  {
    id: 'dialog-preview-tools',
    placement: 'bottom-end',
    visibility: 'hover',
    render: () => (
      <PreviewToolbar>
        <PreviewToolbarButton label="Pan up" onClick={() => state.panBy(0, -PAN_STEP)}>
          <ArrowUp className="size-3.5" />
        </PreviewToolbarButton>
        <PreviewToolbarButton label="Pan left" onClick={() => state.panBy(-PAN_STEP, 0)}>
          <ArrowLeft className="size-3.5" />
        </PreviewToolbarButton>
        <PreviewToolbarButton label="Pan right" onClick={() => state.panBy(PAN_STEP, 0)}>
          <ArrowRight className="size-3.5" />
        </PreviewToolbarButton>
        <PreviewToolbarButton label="Pan down" onClick={() => state.panBy(0, PAN_STEP)}>
          <ArrowDown className="size-3.5" />
        </PreviewToolbarButton>
        <PreviewToolbarButton label="Zoom in" onClick={() => state.zoomBy(ZOOM_FACTOR)}>
          <ZoomIn className="size-3.5" />
        </PreviewToolbarButton>
        <PreviewToolbarButton label="Zoom out" onClick={() => state.zoomBy(1 / ZOOM_FACTOR)}>
          <ZoomOut className="size-3.5" />
        </PreviewToolbarButton>
        <PreviewToolbarButton
          label={state.dragEnabled ? 'Disable drag' : 'Enable drag'}
          pressed={state.dragEnabled}
          onClick={state.toggleDrag}
        >
          <Hand className="size-3.5" />
        </PreviewToolbarButton>
      </PreviewToolbar>
    ),
  },
];

/** 拥有独立预览与源码 controller 的全屏演示弹窗。 */
export const ComponentPreviewDialog: FC<ComponentPreviewDialogProps> = props => {
  const {
    name,
    Component,
    source,
    defaultSourceFile,
    align,
    initialSize,
    controlState,
    controlDefinition,
    controlContract,
    showContextBar,
    themeMode,
    onThemeModeChange,
    enableThemeSwitch = false,
    themeStyleSelection = 'inherit',
    onThemeStyleChange,
    controlPanelOpen,
    onControlPanelOpenChange,
    controlSlots,
    dialogActions,
    showAskAi = true,
    onClose,
  } = props;
  const [globalDefaults] = useState(() => {
    const { rendererMode, dragEnabled } = useComponentPreviewStore.getState();
    return { rendererMode, dragEnabled };
  });
  const sourceState = useSourcePanelState(source, defaultSourceFile);
  const previewState = usePreviewPanelState({
    controlState,
    rendererMode: globalDefaults.rendererMode,
    rendererModeOverride: sourceState.activeRendererMode,
    size: initialSize,
    dragEnabled: globalDefaults.dragEnabled,
    expanded: true,
    hovered: true,
    pinned: true,
  });
  const setAiOpen = useAiChatStore(state => state.setOpen);
  const fillAiDraft = useAiChatStore(state => state.fillDraftAndFocus);
  const aiCurrentPage = useAiChatStore(state => state.currentPage);
  const hasCode = sourceState.views.length > 0;
  const previewToolSlots = buildDialogPreviewToolSlots(previewState);
  const resolvedDialogControlSlots = mergePreviewControlSlots(controlSlots, previewToolSlots);
  const downloadLabel = previewState.rendererMode === 'canvas' ? 'Download PNG' : 'Download SVG';

  const handleAskAi = () => {
    const lang = aiCurrentPage?.lang ?? 'zh';
    const pageTitle = aiCurrentPage?.title ?? '';
    setAiOpen(true);
    fillAiDraft(buildAskAiPrompt(lang, pageTitle, '', name));
  };
  const previewPanel = (
    <PreviewWorkspace
      definition={controlDefinition}
      controlContract={controlContract}
      controlState={controlState}
      showContextBar={showContextBar}
      themeMode={themeMode}
      onThemeModeChange={onThemeModeChange}
      enableThemeSwitch={enableThemeSwitch}
      themeStyleSelection={themeStyleSelection}
      onThemeStyleChange={onThemeStyleChange}
      controlPanelOpen={controlPanelOpen}
      controlDensity="default"
      onControlPanelOpenChange={onControlPanelOpenChange}
      previewState={previewState}
      Component={Component}
      activeRender={sourceState.activeRender}
      controlSlots={resolvedDialogControlSlots}
      previewClassName={cn('flex h-full w-full justify-center overflow-hidden p-10 select-none', alignClass[align])}
      previewStyle={DOT_PATTERN_STYLE}
      pinControlsOnClick={false}
    />
  );

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[90vh] max-h-[900px] w-[96vw] max-w-[1500px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1500px]"
      >
        <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <DialogTitle className="font-mono text-sm font-normal text-muted-foreground">{name}</DialogTitle>
          <div className="flex items-center gap-1">
            {dialogActions?.map(action => (
              <span key={action.id}>{action.render(previewState.runtime)}</span>
            ))}
            <RendererModeButton
              rendererMode={previewState.rendererMode}
              disabled={previewState.rendererModeFixed}
              onToggle={previewState.toggleRendererMode}
            />
            <ToolbarIconButton
              label="Reset"
              title="Reset"
              disabled={!previewState.isTransformed}
              onClick={previewState.resetTransform}
            >
              <RotateCcw className="size-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label={downloadLabel}
              title={downloadLabel}
              onClick={() => downloadPreviewImage(previewState.renderPaneRef.current, name, previewState.rendererMode)}
            >
              <Download className="size-4" />
            </ToolbarIconButton>
            <DialogClose asChild>
              <ToolbarIconButton label="Close" title="Close">
                <X className="size-4" />
              </ToolbarIconButton>
            </DialogClose>
          </div>
        </header>
        {hasCode ? (
          <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
            <ResizablePanel defaultSize={60} minSize={30} maxSize={85}>
              {previewPanel}
            </ResizablePanel>
            <PreviewResizeHandle />
            <ResizablePanel defaultSize={40} minSize={15}>
              <SourcePanel
                state={sourceState}
                headerActions={
                  showAskAi ? (
                    <ToolbarIconButton label="Ask AI" title="Ask AI" onClick={handleAskAi}>
                      <Sparkles className="size-4" />
                    </ToolbarIconButton>
                  ) : undefined
                }
                className="h-full min-w-0 bg-muted/30"
                codeClassName="[&_code]:!text-sm [&_pre]:!text-xs"
                showLineNumbers
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="min-h-0 flex-1">{previewPanel}</div>
        )}
      </DialogContent>
    </Dialog>
  );
};
