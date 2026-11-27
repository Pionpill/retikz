import type { HydrationHandlers } from '@retikz/render/hydration';
import type { RenderMode } from '@retikz/render/runtime';

import type { ProcessOptions } from './runtime';

/** DOM 与框架宿主共享的场景视图配置 */
export type SceneViewOptions = ProcessOptions & {
  /**
   * 渲染后端；缺省使用 SVG，框架宿主可从上下文继承
   * @default 'svg'
   */
  renderer?: RenderMode;
  /**
   * SVG 或 Canvas CSS 宽度；缺省按内容尺寸计算，单轴数值尺寸按内容比例补齐另一轴，CSS 字符串尺寸由浏览器排版
   * @default computeDisplaySize
   */
  width?: number | string;
  /**
   * SVG 或 Canvas CSS 高度；缺省按内容尺寸计算，单轴数值尺寸按内容比例补齐另一轴，CSS 字符串尺寸由浏览器排版
   * @default computeDisplaySize
   */
  height?: number | string;
  /**
   * SVG 资源 id 前缀；省略时由宿主生成
   */
  idPrefix?: string;
  /**
   * 是否播放动画；未指定时遵循系统减少动态效果偏好
   * @default resolveAnimationEnabled
   */
  animate?: boolean;
  /** 动画采样时刻，单位为毫秒；指定后定格在该时刻，不播放动画，优先于 animate */
  snapshotAt?: number;
  /** 按图元 id 绑定的初始事件处理函数表 */
  handlers?: HydrationHandlers;
};
