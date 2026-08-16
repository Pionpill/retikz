import type { z } from 'zod';

import type { IRClip, IRJsonObject } from '../../schemas';
import type { SceneClipPath } from '../scene';

/** Clip Definition 解析并降低的开放 JSON 裁剪形状 */
export type ClipShape = IRJsonObject & {
  /** 与 definition、spec 和 registry 一致的判别字段 */
  kind: string;
};

/** 用户坐标系中的矩形裁剪形状 */
export type RectClipShape = IRJsonObject & {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
};

/** clip spec 的最小判别形态 */
export type ClipLike = {
  /** clip spec 判别字段，对应 clip registry key */
  kind: string;
};

/**
 * clip resolve 运行时上下文
 * @description 自定义 clip 可复用 compile 的取整策略，也可递归解析子 clip spec
 */
export type ClipResolveContext = {
  /** 精度取整函数（与 compile/render 同一 round，保几何一致） */
  round: (value: number) => number;
  /** 递归解析一个 IR clip spec，供 compound clip 等组合能力复用 */
  resolve: (clip: IRClip) => ClipShape;
};

/** ClipShape lowering 的递归上下文 */
export type ClipLowerContext = {
  /** 与当前 compile 共享的 Scene 精度函数 */
  round: (value: number) => number;
  /** 通过当前 Clip registry 降低嵌套形状 */
  lower: (shape: ClipShape) => SceneClipPath;
};

/** clip definition 的作者侧输入形态 */
export type ClipDefinitionInput<TClip extends ClipLike, TShape extends ClipShape = ClipShape> = {
  /** 注册表 key，由 IR clip spec 的 `kind` 引用 */
  kind: TClip['kind'] & TShape['kind'];
  /** 该 clip spec 的 zod schema */
  schema: z.ZodType<TClip>;
  /** 把 schema parse 后的 spec 解析为同 kind 的 ClipShape */
  resolve: {
    bivarianceHack: (spec: TClip, context: ClipResolveContext) => TShape;
  }['bivarianceHack'];
  /** 完整 ClipShape snapshot 的 Zod schema */
  shapeSchema: z.ZodType<TShape>;
  /** 把已校验的同 kind ClipShape 降低为渲染无关路径 */
  lower: {
    bivarianceHack: (shape: TShape, context: ClipLowerContext) => SceneClipPath;
  }['bivarianceHack'];
};

/** clip 定义的注册表形态：保留 schema 泛型并擦除 callback 参数 */
export type ClipDefinition<TClip extends ClipLike = ClipLike, TShape extends ClipShape = ClipShape> = Readonly<{
  /** 注册表 key，由 IR clip spec 的 `kind` 引用 */
  kind: TClip['kind'] & TShape['kind'];
  /** 该 clip spec 的 zod schema */
  schema: z.ZodType<TClip>;
  /** registry 只在 spec schema parse 后调用的擦除解析入口 */
  resolve: (spec: ClipLike, context: ClipResolveContext) => ClipShape;
  /** 完整 ClipShape snapshot 的 Zod schema */
  shapeSchema: z.ZodType<TShape>;
  /** registry 只在 shapeSchema parse 后调用的擦除 lowering 入口 */
  lower: (shape: ClipShape, context: ClipLowerContext) => SceneClipPath;
}>;
