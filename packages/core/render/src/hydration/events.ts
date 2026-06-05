import type { ValueOf } from '@retikz/core';

/**
 * 水合事件名（面向用户的语义名，全程无缩写）
 * @description as const 对象 + ValueOf 派生联合；rightClick 不写 contextmenu、doubleClick 不写 dblclick。
 *   事件集即注册表，加值即扩展。
 */
export const HYDRATION_EVENTS = {
  /** 单击 */
  click: 'click',
  /** 双击 */
  doubleClick: 'doubleClick',
  /** 右键（默认不抑制浏览器菜单，handler 自行 preventDefault） */
  rightClick: 'rightClick',
  /** 指针按下 */
  pointerDown: 'pointerDown',
  /** 指针抬起 */
  pointerUp: 'pointerUp',
  /** 指针移动 */
  pointerMove: 'pointerMove',
  /** 指针进入图元（由 pointermove + 命中 id 状态机合成，跨子元素不重复） */
  pointerEnter: 'pointerEnter',
  /** 指针离开图元（由 pointermove + 命中 id 状态机合成） */
  pointerLeave: 'pointerLeave',
  /** 滚轮 */
  wheel: 'wheel',
} as const;

/** 水合事件名联合 */
export type EventName = ValueOf<typeof HYDRATION_EVENTS>;

/**
 * EventName → 真实 DOM 事件类型（根级 addEventListener 用）
 * @description doubleClick→dblclick、rightClick→contextmenu。pointerEnter / pointerLeave 不在表内、不直接
 *   addEventListener——它们由控制器经 pointermove + 「上一帧命中 id」状态机合成（renderer 无关，经 locate），
 *   故类型用 Exclude 把这两个排除掉。
 */
export const EVENT_DOM_TYPE: Record<Exclude<EventName, 'pointerEnter' | 'pointerLeave'>, string> = {
  click: 'click',
  doubleClick: 'dblclick',
  rightClick: 'contextmenu',
  pointerDown: 'pointerdown',
  pointerUp: 'pointerup',
  pointerMove: 'pointermove',
  wheel: 'wheel',
};

/** 单个图元 id 的事件 → handler 映射 */
export type ElementHandlers = Partial<Record<EventName, (event: Event) => void>>;

/** 水合 handler 注册表：id → 事件名 → handler */
export type HydrationHandlers = Record<string, ElementHandlers>;

/** 把一次 DOM 事件定位到图元 id（svg = closest；canvas = hitTest），命不中返回 null */
export type Locate = (event: Event) => string | null;
