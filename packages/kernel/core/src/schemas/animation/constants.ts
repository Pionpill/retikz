/**
 * 可动画属性通道（renderer 无关；DrawWay 风格 const + 派生类型，裸字面量 'opacity' 仍第一形态）
 * @description `viewBox` 仅在 scene 根合法（镜头），元素级 viewBox track 由 compile / render 拒；
 *   `pathDraw` 是 0..1 路径画出进度；`scaleX` / `scaleY` 是非均匀缩放（柱状图从基线长出等），`scale` 是均匀缩放；
 *   transform 通道（scale / scaleX / scaleY / rotate）的支点见 track 级 `origin`，缺省几何中心。
 *   各后端按通道翻译：SVG WAAPI/CSS、Canvas rAF 几何 lerp。
 */
export const AnimationProperty = {
  Opacity: 'opacity',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
  TranslateX: 'translateX',
  TranslateY: 'translateY',
  Rotate: 'rotate',
  Scale: 'scale',
  ScaleX: 'scaleX',
  ScaleY: 'scaleY',
  PathDraw: 'pathDraw',
  ViewBox: 'viewBox',
} as const;

/** 缓动具名预设（与 CSS 同名）；track / keyframe 亦可改用 cubic-bezier 四元组 */
export const AnimationEasing = {
  Linear: 'linear',
  Ease: 'ease',
  EaseIn: 'ease-in',
  EaseOut: 'ease-out',
  EaseInOut: 'ease-in-out',
} as const;

/** 每次迭代的播放方向（抄 WAAPI / CSS animation-direction） */
export const AnimationDirection = {
  Normal: 'normal',
  Reverse: 'reverse',
  Alternate: 'alternate',
  AlternateReverse: 'alternate-reverse',
} as const;

/** 活动区间外取值（抄 WAAPI / CSS animation-fill-mode） */
export const AnimationFill = {
  None: 'none',
  Forwards: 'forwards',
  Backwards: 'backwards',
  Both: 'both',
} as const;

/** 播放触发器关键字（runtime 落地；DrawWay 风格 const + 派生类型，与其它 Animation 枚举单一真源一致） */
export const AnimationTrigger = { Load: 'load', Visible: 'visible', Manual: 'manual' } as const;
