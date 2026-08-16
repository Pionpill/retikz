import type { z } from 'zod';

import type { IRClip } from '../../schemas';
import type { ClipShape } from '../clip-shape';

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

/** clip definition 的作者侧输入形态 */
export type ClipDefinitionInput<TClip extends ClipLike, TShape extends ClipShape = ClipShape> = {
  /** 注册表 key，由 IR clip spec 的 `kind` 引用 */
  kind: TClip['kind'];
  /** 该 clip spec 的 zod schema */
  schema: z.ZodType<TClip>;
  /** 把 schema parse 后的 spec 解析为 Scene clip shape */
  resolve: (spec: TClip, context: ClipResolveContext) => TShape;
};

/** clip 定义的擦除形态：registry 存这个 */
export type ClipDefinition<
  TClip extends ClipLike = ClipLike,
  TShape extends ClipShape = ClipShape,
> = ClipDefinitionInput<TClip, TShape>;
