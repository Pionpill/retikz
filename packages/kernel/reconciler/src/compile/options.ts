import type { TextMeasurer, CoreProviderDefinitions, ThemeDefinition } from '@retikz/core';
import type { CompileWarning } from '@retikz/core';
import type { TexLowerer } from '@retikz/core';

/** 宿主环境注入的 compile 能力 */
export type CompileHostOptions = {
  /**
   * 注入文字度量函数
   * @default fallbackMeasurer
   */
  measureText?: TextMeasurer;
  /**
   * 运行时注入的公式渲染能力
   * @description 带 tex 内容但未注入或解析失败时会 warning 并降级
   */
  lowerTex?: TexLowerer;
  /**
   * 编译期警告收集器
   * @description path / position 解析失败时按 IR locator + code + message 同步触发
   * @default defaultWarnDispatcher
   */
  onWarn?: (warning: CompileWarning) => void;
};

/** 自动布局与 Scene 输出口径 */
export type CompileLayoutOptions = {
  /**
   * layout 周围的留白
   * @description 必须是非负有限数值
   * @default DEFAULT_LAYOUT_PADDING (10)
   */
  padding?: number;
  /**
   * 输出坐标的小数位精度
   * @description 仅作用于 Scene 输出；内部几何保持 double 精度。必须是非负整数，且 10 的对应次幂为有限数值
   * @default DEFAULT_PRECISION (2)
   */
  precision?: number;
  /**
   * 相对定位距离
   * @description `Node.position` 为 `{ direction, of }` 且未自带 `distance` 时取此值。必须是有限数值，负值表示反方向偏移
   * @default DEFAULT_NODE_DISTANCE (24)
   */
  nodeDistance?: number;
  /**
   * 节点 label 视觉盒与节点边界的默认净距
   * @description `Node.label.distance` 未设置时取此值，必须是 finite nonnegative number
   * @default DEFAULT_LABEL_DISTANCE (12)
   */
  labelDistance?: number;
  /**
   * 默认字号
   * @description `font.size` 缺省时使用此值；同时作为字号 preset 与 `rem` 的根字号。不改变显式数字字号
   * @default DEFAULT_FONT_SIZE (16)
   */
  fontSize?: number;
};

/** 运行时注入的 provider 注册表 */
export type CompileProviderOptions = Omit<CoreProviderDefinitions, 'composites'> & {
  /** 运行时注入的 Core Theme definitions */
  themeDefinitions?: ReadonlyArray<ThemeDefinition>;
};
