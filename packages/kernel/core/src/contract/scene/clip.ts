import type { IRClipFillRule } from '../../schemas';
import type { PathCommand } from './path';

/** renderer、bounds 与 hit-test 共同消费的规范裁剪路径 */
export type SceneClipPath = {
  /** 按 authored 子路径顺序保存的结构化命令 */
  commands: Array<PathCommand>;
  /** 整条裁剪路径使用的显式填充规则 */
  fillRule: IRClipFillRule;
};

/** 可被 primitive 或 group 引用的具名 Scene 裁剪资源 */
export type ClipResource = {
  /** 标识场景裁剪资源 */
  kind: 'clip';
  /** 供场景图元引用的资源标识 */
  id: string;
  /** 后端无关的完整裁剪路径 */
  path: SceneClipPath;
};
