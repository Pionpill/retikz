import { PanelLeftOpen } from 'lucide-react';
import type { CSSProperties, FC, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import type { Lang } from '@/i18n';
import { cn } from '@/lib';
import { useComponentPreviewStore } from '@/modules/docs/store';

import { ToolbarIconButton } from '../components';
import { PreviewContextBar, PreviewThemeBoundary } from '../context-bar';
import { mergePreviewControlSlots } from '../controls';
import type { PreviewPanelState } from '../preview-panel';
import { PreviewPanel } from '../preview-panel';
import { usePreviewTheme } from '../theme';
import type {
  PreviewControlContract,
  ComponentPreviewDemoComponent,
  PreviewControlsDefinition,
  PreviewControlSlot,
  PreviewControlState,
  PreviewFigureType,
  PreviewThemeMode,
  PreviewThemeStyleSelection,
  RendererMode,
} from '../types';
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
  /** 叙述性图示的说明类型。 */
  figureType?: PreviewFigureType;
  /** 当前预览使用的局部主题 */
  themeMode: PreviewThemeMode;
  /** 当前预览实际生效的 ThemeStyle */
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
  /** 属性面板的默认尺寸百分比。桌面端为宽度，窄屏时等比作为高度 */
  controlPanelDefaultSize?: number;
  /** 属性面板字段控件密度
   * @default default
   */
  controlDensity?: 'compact' | 'default';
  /** 更新 Card/Dialog 共享的打开状态 */
  onControlPanelOpenChange: (open: boolean) => void;
  /** 当前宿主独享的视图 controller */
  previewState: PreviewPanelState;
  /** 默认 React demo */
  Component: ComponentPreviewDemoComponent;
  /** 当前文档语言。 */
  lang?: Lang;
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

type PreviewWorkspaceDirection = 'horizontal' | 'vertical';

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
    figureType,
    themeMode,
    enableThemeSwitch = false,
    themeStyleSelection = 'inherit',
    onThemeStyleChange,
    onThemeModeChange,
    controlPanelOpen,
    controlPanelDefaultSize,
    controlDensity = 'default',
    onControlPanelOpenChange,
    previewState,
    Component,
    lang = 'zh',
    activeRender,
    controlSlots,
    previewClassName,
    previewRenderPaneClassName,
    previewStyle,
    pinControlsOnClick,
  } = props;
  const previewTheme = usePreviewTheme(themeStyleSelection, themeMode);
  const controlsLocked = useComponentPreviewStore(state => state.controlsLocked);
  const { direction, workspaceRef } = usePreviewWorkspaceDirection();
  const defaultControlPanelSize =
    controlPanelDefaultSize ??
    (definition?.presentation === 'panel'
      ? (definition.defaultSize ?? DEFAULT_CONTROL_PANEL_SIZE)
      : DEFAULT_CONTROL_PANEL_SIZE);
  const panelSizeRef = useRef(defaultControlPanelSize);
  const [panelSize, setPanelSize] = useState(defaultControlPanelSize);
  const handleControlPanelOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setPanelSize(panelSizeRef.current);
      onControlPanelOpenChange(open);
    },
    [onControlPanelOpenChange],
  );
  const closeControlPanel = useCallback(() => handleControlPanelOpenChange(false), [handleControlPanelOpenChange]);

  const renderPreviewPane = (resolvedControlSlots: Array<PreviewControlSlot> | undefined) => (
    <div
      data-slot="preview-context-pane"
      className="group/preview-context relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      {showContextBar && !controlsLocked ? (
        <PreviewContextBar
          themeMode={themeMode}
          onThemeModeChange={onThemeModeChange}
          figureType={figureType}
          lang={lang}
          enableThemeSwitch={enableThemeSwitch}
          themeStyle={previewTheme.style}
          themeStyleSelection={themeStyleSelection}
          onThemeStyleChange={onThemeStyleChange}
        />
      ) : null}
      <PreviewPanel
        state={previewState}
        Component={Component}
        lang={lang}
        activeRender={activeRender}
        theme={previewTheme}
        controlSlots={resolvedControlSlots}
        className={previewClassName}
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

  return (
    <div ref={workspaceRef} data-slot="preview-workspace" className={cn('h-full min-h-0', workspaceClassName)}>
      <PreviewThemeBoundary themeMode={themeMode} className="h-full overflow-hidden">
        <ResizablePanelGroup direction={direction} dir="ltr" className="h-full min-h-0">
          {controlPanelOpen ? (
            <>
              <ResizablePanel
                order={1}
                defaultSize={panelSize}
                minSize={18}
                maxSize={50}
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
