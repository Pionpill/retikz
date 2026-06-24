/**
 * SVG 动画播放子模块 barrel —— 公开类型 + 收集器工厂
 * @description load track → CSS `@keyframes`（SSR 零 JS 自播）；交互 track → WAAPI 描述（runtime 应用）。
 *   收集器由 document builder 内部使用；descriptor 类型供 runtime（vanilla / react）与第三方 adapter 消费。
 */
export {
  type SvgAnimationCollector,
  type SvgAnimationOptions,
  createSvgAnimationCollector,
} from './keyframes';
export type { WaapiDescriptor, WaapiKeyframe, WaapiTiming } from './waapi';
