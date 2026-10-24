import type { ZodType } from 'zod';

import type { IRClip } from '../schemas';
import type { SceneClipPath } from './scene';

/** 生成裁剪路径时可用的上下文 */
export type ClipLowerContext = {
  /** 与当前编译共享的精度取整函数 */
  round: (value: number) => number;
  /** 生成子裁剪声明的路径 */
  lower: (clip: IRClip) => SceneClipPath;
};

/** 裁剪能力定义 */
export type ClipDefinition<TClip extends IRClip = IRClip> = Readonly<{
  /** 裁剪名称，与输入的 kind 一致 */
  kind: TClip['kind'];
  /** 校验裁剪声明 */
  schema: ZodType<TClip>;
  /** 将裁剪声明转换为路径 */
  lower: (clip: TClip, context: ClipLowerContext) => SceneClipPath;
}>;

/**
 * 创建可注册的裁剪能力定义
 * @template TClip 经 schema 解析的裁剪声明类型
 */
export const defineClip = <TClip extends IRClip>(definition: ClipDefinition<TClip>): ClipDefinition =>
  definition as unknown as ClipDefinition;
