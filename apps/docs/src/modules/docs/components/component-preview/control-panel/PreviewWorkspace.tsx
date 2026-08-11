import type {
  CSSProperties,
  FC,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  RefObject,
  TouchEvent as ReactTouchEvent,
} from 'react';

import { PanelLeftOpen } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib';

import type { PreviewPanelState } from '../preview-panel';
import type { PreviewThemeStyleValue } from '../theme';
import type {
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewControlSlot,
  PreviewControlState,
  PreviewThemeMode,
  PreviewThemeStyleSelection,
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
  /** 当前 demo 的完整 controls contract */
  controlContract?: PreviewControlContract;
  /** 工作区容器附加样式 */
  workspaceClassName?: string;
  /** Card/Dialog 共享的字段值状态 */
  controlState: PreviewControlState;
  /** 是否显示预览上下文栏 */
  showContextBar: boolean;
  /** 当前预览使用的局部主题 */
  themeMode: PreviewThemeMode;
  /** 当前预览实际生效的 ThemeStyle */
  themeStyle?: PreviewThemeStyleValue;
  /** 是否显示单预览 ThemeStyle 切换器 */
  enableThemeSwitch?: boolean;
  /** 当前单预览 ThemeStyle 选择 */
  themeStyleSelection?: PreviewThemeStyleSelection;
  /** 更新当前单预览 ThemeStyle 选择 */
  onThemeStyleChange?: (themeStyle: PreviewThemeStyleSelection) => void;
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
const MOBILE_WORKSPACE_BREAKPOINT = 480;
const DEFAULT_MOBILE_CONTROL_PANEL_HEIGHT = 200;
const MIN_MOBILE_CONTROL_PANEL_HEIGHT = 100;
const MAX_MOBILE_CONTROL_PANEL_HEIGHT = 300;
const MOBILE_CONTROL_PANEL_KEYBOARD_STEP = 10;

type PreviewWorkspaceDirection = 'horizontal' | 'vertical';

type MobileControlPanelResizeStart = {
  clientY: number;
  height: number;
};

/** 把窄屏属性面板高度限制在可拖拽范围内 */
const clampMobileControlPanelHeight = (height: number): number =>
  Math.min(MAX_MOBILE_CONTROL_PANEL_HEIGHT, Math.max(MIN_MOBILE_CONTROL_PANEL_HEIGHT, height));

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
    controlContract,
    workspaceClassName,
    controlState,
    showContextBar,
    themeMode,
    themeStyle,
    enableThemeSwitch = false,
    themeStyleSelection = 'inherit',
    onThemeStyleChange,
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
  const defaultControlPanelSize =
    definition?.presentation === 'panel'
      ? (definition.defaultSize ?? DEFAULT_CONTROL_PANEL_SIZE)
      : DEFAULT_CONTROL_PANEL_SIZE;
  const panelSizeRef = useRef(defaultControlPanelSize);
  const [panelSize, setPanelSize] = useState(defaultControlPanelSize);
  const mobileResizeStartRef = useRef<MobileControlPanelResizeStart | null>(null);
  const [mobileControlPanelHeight, setMobileControlPanelHeight] = useState(DEFAULT_MOBILE_CONTROL_PANEL_HEIGHT);
  const handleControlPanelOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setPanelSize(panelSizeRef.current);
      onControlPanelOpenChange(open);
    },
    [onControlPanelOpenChange],
  );
  const closeControlPanel = useCallback(() => handleControlPanelOpenChange(false), [handleControlPanelOpenChange]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const start = mobileResizeStartRef.current;
      if (!start) return;

      setMobileControlPanelHeight(clampMobileControlPanelHeight(start.height + event.clientY - start.clientY));
    };
    const handleMouseUp = () => {
      mobileResizeStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const renderPreviewPane = (resolvedControlSlots: Array<PreviewControlSlot> | undefined) => (
    <div
      data-slot="preview-context-pane"
      className="group/preview-context relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      {showContextBar ? (
        <PreviewContextBar
          themeMode={themeMode}
          onThemeModeChange={onThemeModeChange}
          enableThemeSwitch={enableThemeSwitch}
          themeStyle={themeStyle}
          themeStyleSelection={themeStyleSelection}
          onThemeStyleChange={onThemeStyleChange}
        />
      ) : null}
      <PreviewPanel
        state={previewState}
        Component={Component}
        activeRender={activeRender}
        themeStyle={themeStyle}
        themeMode={themeMode}
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
  const startMobileResize = (clientY: number) => {
    mobileResizeStartRef.current = {
      clientY,
      height: mobileControlPanelHeight,
    };
  };
  const handleMobileResizeMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    startMobileResize(event.clientY);
  };
  const handleMobileResizeTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    startMobileResize(touch.clientY);
  };
  const handleMobileResizeTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    const start = mobileResizeStartRef.current;
    const touch = event.touches[0];
    if (!start) return;

    event.preventDefault();
    setMobileControlPanelHeight(clampMobileControlPanelHeight(start.height + touch.clientY - start.clientY));
  };
  const handleMobileResizeTouchEnd = () => {
    mobileResizeStartRef.current = null;
  };
  const handleMobileResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    let nextHeight: number | undefined;

    if (event.key === 'ArrowUp') nextHeight = mobileControlPanelHeight - MOBILE_CONTROL_PANEL_KEYBOARD_STEP;
    if (event.key === 'ArrowDown') nextHeight = mobileControlPanelHeight + MOBILE_CONTROL_PANEL_KEYBOARD_STEP;
    if (event.key === 'Home') nextHeight = MIN_MOBILE_CONTROL_PANEL_HEIGHT;
    if (event.key === 'End') nextHeight = MAX_MOBILE_CONTROL_PANEL_HEIGHT;
    if (nextHeight === undefined) return;

    event.preventDefault();
    setMobileControlPanelHeight(clampMobileControlPanelHeight(nextHeight));
  };

  if (direction === 'vertical' && controlPanelOpen) {
    return (
      <div ref={workspaceRef} data-slot="preview-workspace" className="min-h-0">
        <PreviewThemeBoundary themeMode={themeMode} className="overflow-hidden">
          <div data-slot="preview-mobile-stack" className="flex min-h-0 flex-col">
            <div
              data-slot="preview-mobile-control-panel"
              className="shrink-0"
              style={{ height: mobileControlPanelHeight }}
            >
              <PreviewControlPanel
                definition={definition}
                controlContract={controlContract}
                controlState={controlState}
                density={controlDensity}
                onClose={closeControlPanel}
              />
            </div>
            <div
              data-slot="preview-mobile-resize-handle"
              role="separator"
              aria-orientation="horizontal"
              aria-valuemin={MIN_MOBILE_CONTROL_PANEL_HEIGHT}
              aria-valuemax={MAX_MOBILE_CONTROL_PANEL_HEIGHT}
              aria-valuenow={mobileControlPanelHeight}
              tabIndex={0}
              className="relative flex h-2 shrink-0 touch-none cursor-row-resize items-center justify-center border-y bg-border/40 outline-none select-none before:h-1 before:w-8 before:rounded-full before:bg-border focus-visible:ring-1 focus-visible:ring-ring"
              onMouseDown={handleMobileResizeMouseDown}
              onTouchStart={handleMobileResizeTouchStart}
              onTouchMove={handleMobileResizeTouchMove}
              onTouchEnd={handleMobileResizeTouchEnd}
              onTouchCancel={handleMobileResizeTouchEnd}
              onKeyDown={handleMobileResizeKeyDown}
            />
            <div data-slot="preview-mobile-pane" className={cn('min-h-0', workspaceClassName ?? 'h-80')}>
              {renderPreviewPane(resolvedControlSlots)}
            </div>
          </div>
        </PreviewThemeBoundary>
      </div>
    );
  }

  return (
    <div ref={workspaceRef} data-slot="preview-workspace" className={cn('h-full min-h-0', workspaceClassName)}>
      <PreviewThemeBoundary themeMode={themeMode} className="h-full overflow-hidden">
        <ResizablePanelGroup direction="horizontal" dir="ltr" className="min-h-0">
          {controlPanelOpen ? (
            <>
              <ResizablePanel
                order={1}
                defaultSize={panelSize}
                minSize={18}
                maxSize={45}
                collapsible
                collapsedSize={0}
                onCollapse={() => handleControlPanelOpenChange(false)}
                onResize={size => {
                  if (size > 0) panelSizeRef.current = size;
                }}
              >
                <PreviewControlPanel
                  definition={definition}
                  controlContract={controlContract}
                  controlState={controlState}
                  density={controlDensity}
                  onClose={closeControlPanel}
                />
              </ResizablePanel>
              <PreviewResizeHandle />
            </>
          ) : null}
          <ResizablePanel order={2} defaultSize={controlPanelOpen ? 100 - panelSize : 100} minSize={45}>
            {renderPreviewPane(resolvedControlSlots)}
          </ResizablePanel>
        </ResizablePanelGroup>
      </PreviewThemeBoundary>
    </div>
  );
};
