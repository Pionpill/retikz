import type { ReactNode, RefObject } from 'react';

import { Fragment, useState } from 'react';

import type { PreviewAction, PreviewActionContext, PreviewActionState, PreviewOverlay, RendererMode } from '../types';

import { ANIM_PAUSE_ID, buildAnimationActions } from '../animation-actions';

export type PreviewActionsState = {
  replayNonce: number;
  actionCtx: PreviewActionContext;
  allActions: Array<PreviewAction>;
  previewActionState: PreviewActionState;
  overlayNodes: Array<ReactNode>;
};

export type UsePreviewActionsOptions = {
  animated: boolean;
  actions?: Array<PreviewAction>;
  overlays?: Array<PreviewOverlay>;
  rendererMode: RendererMode;
  renderPaneRef: RefObject<HTMLElement | null>;
};

/** 预览卡和详情弹窗共用的动作栏运行时状态。 */
export const usePreviewActions = (options: UsePreviewActionsOptions): PreviewActionsState => {
  const { animated, actions, overlays, rendererMode, renderPaneRef } = options;
  // 重播：bump nonce -> keyed Fragment 重挂渲染子树（CSS @keyframes / canvas rAF / WAAPI 重置）。
  const [replayNonce, setReplayNonce] = useState(0);
  // per-preview 工具开关态（播放暂停、未来性能监视器等 toggle 类工具）。
  const [toolState, setToolState] = useState<Record<string, boolean>>({});
  const [actionValues, setActionValues] = useState<Record<string, string>>({});

  const actionCtx: PreviewActionContext = {
    replay: () => setReplayNonce(n => n + 1),
    rendererMode,
    get renderPane() {
      return renderPaneRef.current;
    },
    active: id => toolState[id] ?? false,
    setActive: (id, on) => setToolState(prev => ({ ...prev, [id]: on ?? !prev[id] })),
    actionValue: id => actionValues[id],
    setActionValue: (id, value) => setActionValues(prev => ({ ...prev, [id]: value })),
  };
  const builtinActions = animated ? buildAnimationActions(toolState[ANIM_PAUSE_ID] ?? false) : [];
  const allActions: Array<PreviewAction> = [...builtinActions, ...(actions ?? [])];
  const previewActionState = {
    values: actionValues,
    setValue: actionCtx.setActionValue,
  };
  const overlayNodes = (overlays ?? []).map(o => <Fragment key={o.id}>{o.render(actionCtx)}</Fragment>);

  return {
    replayNonce,
    actionCtx,
    allActions,
    previewActionState,
    overlayNodes,
  };
};
