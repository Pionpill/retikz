import type { ValueOf } from '@retikz/foundation';

/** 节点待处理变化的来源 */
export const WeaveChangeSource = {
  /** 自身输入变化 */
  Own: 'own',
  /** 有效继承上下文变化 */
  Context: 'context',
  /** 读取的依赖结果变化 */
  Dependency: 'dependency',
} as const;

export type WeaveChangeSource = ValueOf<typeof WeaveChangeSource>;

/** 变化可能影响的计算范围，可同时包含多个类别 */
export const WeaveChangeKind = {
  /** 视觉呈现变化 */
  Style: 'style',
  /** 定位、尺寸、几何或包络变化 */
  Layout: 'layout',
} as const;

export type WeaveChangeKind = ValueOf<typeof WeaveChangeKind>;
