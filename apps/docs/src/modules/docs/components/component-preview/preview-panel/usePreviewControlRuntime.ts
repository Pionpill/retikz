import type { RefObject } from 'react';

import { useState } from 'react';

import type { PreviewControlRuntime, PreviewControlState, RendererMode } from '../types';

export type UsePreviewControlRuntimeOptions = {
  /** 当前面板渲染模式。 */
  rendererMode: RendererMode;
  /** 当前面板渲染区域 ref。 */
  renderPaneRef: RefObject<HTMLElement | null>;
  /** 面板是否处于 hover 状态。 */
  hovered: boolean;
  /** 控制层是否固定显示。 */
  pinned: boolean;
  /** 面板是否处于放大布局。 */
  expanded: boolean;
};

/** 单个预览面板的控件运行时组合结果。 */
export type PreviewControlRuntimeState = {
  /** 渲染子树重挂载 key。 */
  remountKey: number;
  /** 当前面板独享的控制 runtime。 */
  runtime: PreviewControlRuntime;
  /** 当前面板独享的控件共享值状态。 */
  controlState: PreviewControlState;
};

/** 为单个预览面板创建独立的控制运行时状态。 */
export const usePreviewControlRuntime = (options: UsePreviewControlRuntimeOptions): PreviewControlRuntimeState => {
  const { rendererMode, renderPaneRef, hovered, pinned, expanded } = options;
  const [remountKey, setRemountKey] = useState(0);
  const [activeState, setActiveState] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});

  const remount = () => setRemountKey(key => key + 1);
  const runtime: PreviewControlRuntime = {
    remount,
    rendererMode,
    get renderPane() {
      return renderPaneRef.current;
    },
    hovered,
    pinned,
    expanded,
    active: id => activeState[id] ?? false,
    setActive: (id, on) => setActiveState(prev => ({ ...prev, [id]: on ?? !prev[id] })),
    value: id => values[id],
    setValue: (id, value) => setValues(prev => ({ ...prev, [id]: value })),
  };

  const controlState: PreviewControlState = {
    values,
    setValue: runtime.setValue,
  };

  return { remountKey, runtime, controlState };
};
