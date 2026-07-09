import type { RefObject } from 'react';

import { useState } from 'react';

import type { PreviewControlRuntime, PreviewControlState, RendererMode } from '../types';

export type UsePreviewControlRuntimeOptions = {
  rendererMode: RendererMode;
  renderPaneRef: RefObject<HTMLElement | null>;
  hovered: boolean;
  pinned: boolean;
  expanded: boolean;
};

export type PreviewControlRuntimeState = {
  remountKey: number;
  runtime: PreviewControlRuntime;
  controlState: PreviewControlState;
};

/** 预览卡片和详情弹窗共用的控制运行时状态。 */
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
