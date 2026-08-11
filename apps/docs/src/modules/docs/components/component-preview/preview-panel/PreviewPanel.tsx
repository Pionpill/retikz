import type { CSSProperties, FC, ReactNode } from 'react';

import { AnimationModeProvider } from '@retikz/react';
import { Fragment } from 'react';

import { cn } from '@/lib';
import { useComponentPreviewStore } from '@/modules/docs/store';

import type { PreviewTheme } from '../theme';
import type { PreviewControlSlot, RendererMode } from '../types';
import type { PreviewPanelState } from './usePreviewPanelState';

import { PreviewControlStateContext } from '../context';
import { PreviewThemeProvider } from '../theme';
import { DemoRenderer } from './DemoRenderer';
import { PreviewControlSlotLayer } from './PreviewControlSlotLayer';

/** 通用预览面板属性。 */
export type PreviewPanelProps = {
  /** 面板宿主创建的独立 controller。 */
  state: PreviewPanelState;
  /** 默认 React demo 组件。 */
  Component: FC;
  /** 当前源码视图提供的不可变渲染函数。 */
  activeRender?: (rendererMode: RendererMode) => ReactNode;
  /** 当前预览实际生效的 ThemeStyle。 */
  theme?: PreviewTheme;
  /** 当前预览使用的明暗选择。 */
  /** 针对当前面板 runtime 求值的控制定义。 */
  controlSlots?: Array<PreviewControlSlot>;
  /** 面板容器附加样式。 */
  className?: string;
  /** 渲染区域附加样式。 */
  renderPaneClassName?: string;
  /** 面板容器内联样式。 */
  style?: CSSProperties;
  /** 点击面板时是否切换控制层固定状态。 */
  pinControlsOnClick?: boolean;
};

/** 渲染由宿主 controller 驱动的通用预览面板。 */
export const PreviewPanel: FC<PreviewPanelProps> = props => {
  const animationMode = useComponentPreviewStore(state => state.animationMode);
  const {
    state,
    Component,
    activeRender,
    theme,
    controlSlots = [],
    className,
    renderPaneClassName,
    style,
    pinControlsOnClick = true,
  } = props;
  const {
    rendererMode,
    dragEnabled,
    toolbarPinned,
    toggleToolbarPinned,
    setPreviewHovered,
    remountKey,
    runtime,
    controlState,
    renderPaneRef,
    isDragging,
    transformStyle,
    beginDrag,
  } = state;
  const dragCursor = dragEnabled ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : '';

  return (
    <div
      style={style}
      className={cn('group/preview relative', dragEnabled && 'touch-none', dragCursor, className)}
      onMouseDown={beginDrag(dragEnabled)}
      onMouseEnter={() => setPreviewHovered(true)}
      onMouseLeave={() => setPreviewHovered(false)}
      onTouchStart={beginDrag(dragEnabled)}
      onClick={pinControlsOnClick ? toggleToolbarPinned : undefined}
    >
      <div
        ref={renderPaneRef}
        className={cn(
          'flex max-h-full max-w-full items-center justify-center [&>canvas]:max-h-full [&>canvas]:max-w-full [&>svg]:max-h-full [&>svg]:max-w-full',
          !isDragging && 'transition-transform duration-150',
          renderPaneClassName,
        )}
        style={{ transform: transformStyle }}
      >
        <Fragment key={remountKey}>
          <AnimationModeProvider mode={animationMode}>
            <PreviewControlStateContext.Provider value={controlState}>
              {activeRender ? (
                <PreviewThemeProvider theme={theme}>{activeRender(rendererMode)}</PreviewThemeProvider>
              ) : (
                <DemoRenderer Component={Component} rendererMode={rendererMode} theme={theme} />
              )}
            </PreviewControlStateContext.Provider>
          </AnimationModeProvider>
        </Fragment>
      </div>
      <PreviewControlSlotLayer slots={controlSlots} runtime={runtime} pinned={toolbarPinned} />
    </div>
  );
};
