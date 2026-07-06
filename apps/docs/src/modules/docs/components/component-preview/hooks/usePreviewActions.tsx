import type { RefObject } from 'react';

import { useState } from 'react';

import type { PreviewAction, PreviewActionState, PreviewControlContext, PreviewControlSlot, RendererMode } from '../types';

import { ANIM_PAUSE_ID, buildAnimationActions } from '../animation-actions';

export type PreviewActionsState = {
  replayNonce: number;
  controlCtx: PreviewControlContext;
  slots: Array<PreviewControlSlot>;
  previewActionState: PreviewActionState;
};

export type UsePreviewActionsOptions = {
  animated: boolean;
  actions?: Array<PreviewAction>;
  rendererMode: RendererMode;
  renderPaneRef: RefObject<HTMLElement | null>;
  hovered: boolean;
  pinned: boolean;
  expanded: boolean;
};

/** 预览卡和详情弹窗共用的控制插槽运行时状态。 */
export const usePreviewActions = (options: UsePreviewActionsOptions): PreviewActionsState => {
  const { animated, actions, rendererMode, renderPaneRef, hovered, pinned, expanded } = options;
  const [replayNonce, setReplayNonce] = useState(0);
  const [toolState, setToolState] = useState<Record<string, boolean>>({});
  const [actionValues, setActionValues] = useState<Record<string, string>>({});

  const controlCtx: PreviewControlContext = {
    replay: () => setReplayNonce(n => n + 1),
    rendererMode,
    get renderPane() {
      return renderPaneRef.current;
    },
    hovered,
    pinned,
    expanded,
    active: id => toolState[id] ?? false,
    setActive: (id, on) => setToolState(prev => ({ ...prev, [id]: on ?? !prev[id] })),
    value: id => actionValues[id],
    setValue: (id, value) => setActionValues(prev => ({ ...prev, [id]: value })),
  };
  const builtinSlots = animated ? buildAnimationActions(toolState[ANIM_PAUSE_ID] ?? false) : [];
  const slots: Array<PreviewControlSlot> = [...builtinSlots, ...(actions ?? [])];
  const previewActionState = {
    values: actionValues,
    setValue: controlCtx.setValue,
  };

  return {
    replayNonce,
    controlCtx,
    slots,
    previewActionState,
  };
};
