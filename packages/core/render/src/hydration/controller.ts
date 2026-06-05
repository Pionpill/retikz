import type { HydrationHandlers, Locate } from './events';

/** 水合控制器：根级委托 + enter/leave 合成 + dispose 解绑 */
export type HydrationController = {
  /** 解绑所有根级 listener，之后事件不再触发 */
  dispose: () => void;
};

/**
 * 创建水合控制器：在 root 上挂根级委托，把命中图元 id 的事件分发给 handlers
 * @description renderer 无关上层。对每个用到的 EventName 在 root 注册一个 EVENT_DOM_TYPE 监听器，事件到来时
 *   经 locate 定位到图元 id，查 handlers 触发对应 handler；pointerEnter / pointerLeave 不直接监听、由
 *   pointerover / out + relatedTarget 在根层合成（跨子元素移动只在真正进 / 出图元时各触发一次）。
 *   返回 { dispose } 解绑全部 listener。
 *
 * 当前为 stub（空 dispose）；委托 / 合成逻辑由后续实现补齐。
 */
export const createHydrationController = (
  root: EventTarget,
  handlers: HydrationHandlers,
  locate: Locate,
): HydrationController => {
  void root;
  void handlers;
  void locate;
  return {
    dispose: () => {},
  };
};
