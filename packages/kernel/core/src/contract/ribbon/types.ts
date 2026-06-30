import type { ZodType } from 'zod';

import type { IRJsonObject } from '../../schemas/json';

export type RibbonWidthProfileContext<TParams extends IRJsonObject = IRJsonObject> = {
  /** 沿中心线的归一化位置，范围 [0, 1]。 */
  offset: number;
  /** 中心线近似总长度（user units）。 */
  length: number;
  /** 经过可选 paramsSchema 校验后的 profile 参数。 */
  params: TParams;
};

export type RibbonWidthProfileDefinitionInput<TParams extends IRJsonObject = IRJsonObject> = {
  /** 注册表 key，由 IR `width: { kind: "profile", name }` 引用。 */
  name: string;
  /**
   * 可选的 JSON-safe params schema；compile 在采样前解析 `width.params`。
   * @default 不校验 params
   */
  paramsSchema?: ZodType<TParams>;
  /** 返回指定归一化位置处的非负 ribbon 宽度（user units）。 */
  widthAt: (ctx: RibbonWidthProfileContext<TParams>) => number;
};

export type RibbonWidthProfileDefinition = {
  /** 注册表 key，由 IR `width: { kind: "profile", name }` 引用。 */
  name: string;
  /**
   * 可选的 JSON-safe params schema；compile 在采样前解析 `width.params`。
   * @default 不校验 params
   */
  paramsSchema?: ZodType<IRJsonObject>;
  /** 返回指定归一化位置处的非负 ribbon 宽度（user units）。 */
  widthAt: (ctx: RibbonWidthProfileContext<IRJsonObject>) => number;
};
