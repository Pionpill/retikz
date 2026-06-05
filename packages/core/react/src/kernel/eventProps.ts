import type { EventName } from '@retikz/render/hydration';

/**
 * Kernel 图元的水合事件 props（`on<Event>`）
 * @description 仅类型声明——handler 不进 IR、不在组件 render 时使用，由 `collectHydrationHandlers`
 *   按元素 `id` 收集后喂给 `createHydrationController`。每个 `on<Event>` 对应一个 {@link EventName}：
 *   prop 名 = `on` + EventName 首字母大写；签名收 DOM `Event`（与 renderer 无关的原生事件）。
 *   `<Node>` / `<Path>` / `<Scope>` 复用此类型；`<Coordinate>` 无可点面积、不带这些 props。
 */
export type HydrationEventProps = {
  /** 单击该图元（DOM `click`） */
  onClick?: (event: Event) => void;
  /** 双击该图元（DOM `dblclick`） */
  onDoubleClick?: (event: Event) => void;
  /** 右键该图元（DOM `contextmenu`）；默认不抑制浏览器菜单，handler 自行 `event.preventDefault()` */
  onRightClick?: (event: Event) => void;
  /** 指针在该图元上按下（DOM `pointerdown`） */
  onPointerDown?: (event: Event) => void;
  /** 指针在该图元上抬起（DOM `pointerup`） */
  onPointerUp?: (event: Event) => void;
  /** 指针在该图元上移动（DOM `pointermove`） */
  onPointerMove?: (event: Event) => void;
  /** 指针进入该图元（由 `pointermove` + 命中 id 状态机合成，跨子元素不重复触发） */
  onPointerEnter?: (event: Event) => void;
  /** 指针离开该图元（由 `pointermove` + 命中 id 状态机合成） */
  onPointerLeave?: (event: Event) => void;
  /** 在该图元上滚轮（DOM `wheel`） */
  onWheel?: (event: Event) => void;
};

/**
 * `HydrationEventProps` 的 prop 名 → {@link EventName} 映射
 * @description 收集逻辑用它把组件上的 `on<Event>` props 翻译为注册表里的 EventName 键
 *   （`onClick` → `click`、`onRightClick` → `rightClick`、`onPointerEnter` → `pointerEnter`）。
 *   单一来源，避免在收集器里散写字符串规则。
 */
export const EVENT_PROP_TO_NAME = {
  onClick: 'click',
  onDoubleClick: 'doubleClick',
  onRightClick: 'rightClick',
  onPointerDown: 'pointerDown',
  onPointerUp: 'pointerUp',
  onPointerMove: 'pointerMove',
  onPointerEnter: 'pointerEnter',
  onPointerLeave: 'pointerLeave',
  onWheel: 'wheel',
} as const satisfies Record<keyof HydrationEventProps, EventName>;

/** 水合事件 prop 名联合（`onClick` | `onDoubleClick` | …） */
export type HydrationEventPropName = keyof typeof EVENT_PROP_TO_NAME;
