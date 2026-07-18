import type { CSSProperties, FC, ReactNode, RefObject } from 'react';

import { PanelLeftOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib';

import type { PreviewPanelState } from '../preview-panel';
import type {
  PreviewControlsDefinition,
  PreviewControlSlot,
  PreviewControlState,
  PreviewThemeMode,
  RendererMode,
} from '../types';

import { ToolbarIconButton } from '../components';
import { PreviewContextBar, PreviewThemeBoundary } from '../context-bar';
import { mergePreviewControlSlots } from '../controls';
import { PreviewPanel } from '../preview-panel';
import { PreviewControlPanel } from './PreviewControlPanel';
import { PreviewResizeHandle } from './PreviewResizeHandle';

/** 带可选属性面板的预览工作区属性 */
export type PreviewWorkspaceProps = {
  /** 当前 demo 的声明式控件定义 */
  definition?: PreviewControlsDefinition;
  /** 工作区容器附加样式 */
  workspaceClassName?: string;
  /** Card/Dialog 共享的字段值状态 */
  controlState: PreviewControlState;
  /** 是否显示预览上下文栏 */
  showContextBar: boolean;
  /** 当前预览使用的局部主题 */
  themeMode: PreviewThemeMode;
  /** 更新局部主题 */
  onThemeModeChange: (themeMode: PreviewThemeMode) => void;
  /** 属性面板当前是否打开 */
  controlPanelOpen: boolean;
  /** 属性面板字段控件密度
   * @default default
   */
  controlDensity?: 'compact' | 'default';
  /** 更新 Card/Dialog 共享的打开状态 */
  onControlPanelOpenChange: (open: boolean) => void;
  /** 当前宿主独享的视图 controller */
  previewState: PreviewPanelState;
  /** 默认 React demo */
  Component: FC;
  /** 当前源码视图提供的渲染函数 */
  activeRender?: (rendererMode: RendererMode) => ReactNode;
  /** 当前预览区的浮层控制 slots */
  controlSlots?: Array<PreviewControlSlot>;
  /** 预览面板容器附加样式 */
  previewClassName?: string;
  /** 渲染区域附加样式 */
  previewRenderPaneClassName?: string;
  /** 预览面板内联样式 */
  previewStyle?: CSSProperties;
  /** 点击预览时是否固定控制层 */
  pinControlsOnClick?: boolean;
};

const DEFAULT_CONTROL_PANEL_SIZE = 25;
const DEFAULT_MOBILE_CONTROL_PANEL_SIZE = 40;
const MOBILE_WORKSPACE_BREAKPOINT = 640;

type PreviewWorkspaceDirection = 'horizontal' | 'vertical';

const createDefaultPanelSizes = (): Record<PreviewWorkspaceDirection, number> => ({
  horizontal: DEFAULT_CONTROL_PANEL_SIZE,
  vertical: DEFAULT_MOBILE_CONTROL_PANEL_SIZE,
});

/** 按工作区自身宽度决定属性面板排列方向 */
const usePreviewWorkspaceDirection = (): {
  direction: PreviewWorkspaceDirection;
  workspaceRef: RefObject<HTMLDivElement>;
} => {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<PreviewWorkspaceDirection>('horizontal');

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return undefined;

    const updateDirection = (width: number) => {
      if (width > 0) setDirection(width < MOBILE_WORKSPACE_BREAKPOINT ? 'vertical' : 'horizontal');
    };
    updateDirection(workspace.getBoundingClientRect().width);

    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(entries => {
      entries.forEach(entry => updateDirection(entry.contentRect.width));
    });
    observer.observe(workspace);
    return () => observer.disconnect();
  }, []);

  return { direction, workspaceRef };
};

/** 用 shadcn Resizable 组合属性面板与预览面板 */
export const PreviewWorkspace: FC<PreviewWorkspaceProps> = props => {
  const {
    definition,
    workspaceClassName,
    controlState,
    showContextBar,
    themeMode,
    onThemeModeChange,
    controlPanelOpen,
    controlDensity = 'default',
    onControlPanelOpenChange,
    previewState,
    Component,
    activeRender,
    controlSlots,
    previewClassName,
    previewRenderPaneClassName,
    previewStyle,
    pinControlsOnClick,
  } = props;
  const { direction, workspaceRef } = usePreviewWorkspaceDirection();
  const panelSizesRef = useRef<Record<PreviewWorkspaceDirection, number>>(createDefaultPanelSizes());
  const [panelSizes, setPanelSizes] = useState<Record<PreviewWorkspaceDirection, number>>(createDefaultPanelSizes);

  const renderPreviewPane = (resolvedControlSlots: Array<PreviewControlSlot> | undefined) => (
    <div
      data-slot="preview-context-pane"
      className="group/preview-context relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      {showContextBar ? <PreviewContextBar themeMode={themeMode} onThemeModeChange={onThemeModeChange} /> : null}
      <PreviewPanel
        state={previewState}
        Component={Component}
        activeRender={activeRender}
        controlSlots={resolvedControlSlots}
        className={cn(previewClassName, showContextBar && 'pt-10')}
        renderPaneClassName={previewRenderPaneClassName}
        style={previewStyle}
        pinControlsOnClick={pinControlsOnClick}
      />
    </div>
  );

  if (definition?.presentation !== 'panel') {
    return (
      <div ref={workspaceRef} data-slot="preview-workspace" className={cn('h-full min-h-0', workspaceClassName)}>
        <PreviewThemeBoundary themeMode={themeMode} className="h-full overflow-hidden">
          {renderPreviewPane(controlSlots)}
        </PreviewThemeBoundary>
      </div>
    );
  }

  const openControlPanelSlot: PreviewControlSlot = {
    id: 'control-panel-toggle',
    placement: 'top-start',
    visibility: 'always',
    render: () => (
      <ToolbarIconButton
        label="Open controls panel"
        title="Open controls panel"
        onClick={() => onControlPanelOpenChange(true)}
      >
        <PanelLeftOpen className="size-4" />
      </ToolbarIconButton>
    ),
  };
  const resolvedControlSlots = controlPanelOpen
    ? controlSlots
    : mergePreviewControlSlots(controlSlots, [openControlPanelSlot]);
  const panelSize = panelSizes[direction];
  const isHorizontal = direction === 'horizontal';
  const handleControlPanelOpenChange = (open: boolean) => {
    if (!open) setPanelSizes({ ...panelSizesRef.current });
    onControlPanelOpenChange(open);
  };

  return (
    <div ref={workspaceRef} data-slot="preview-workspace" className={cn('h-full min-h-0', workspaceClassName)}>
      <PreviewThemeBoundary themeMode={themeMode} className="h-full overflow-hidden">
        <ResizablePanelGroup direction={direction} dir="ltr" className="min-h-0">
          {controlPanelOpen ? (
            <>
              <ResizablePanel
                order={1}
                defaultSize={panelSize}
                minSize={isHorizontal ? 18 : 25}
                maxSize={isHorizontal ? 45 : 60}
                collapsible
                collapsedSize={0}
                onCollapse={() => handleControlPanelOpenChange(false)}
                onResize={size => {
                  if (size > 0) panelSizesRef.current[direction] = size;
                }}
              >
                <PreviewControlPanel
                  definition={definition}
                  controlState={controlState}
                  density={controlDensity}
                  onClose={() => handleControlPanelOpenChange(false)}
                />
              </ResizablePanel>
              <PreviewResizeHandle />
            </>
          ) : null}
          <ResizablePanel
            order={2}
            defaultSize={controlPanelOpen ? 100 - panelSize : 100}
            minSize={isHorizontal ? 45 : 30}
          >
            {renderPreviewPane(resolvedControlSlots)}
          </ResizablePanel>
        </ResizablePanelGroup>
      </PreviewThemeBoundary>
    </div>
  );
};
