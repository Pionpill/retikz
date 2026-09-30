import type { JsonObject } from '@retikz/foundation';
import type { ZodType } from 'zod';

/**
 * 宽度函数在一次中心线采样中收到的位置、长度与参数
 * @template TParams 宽度函数参数的 JSON 对象类型，默认 JsonObject
 */
export type RibbonWidthProfileContext<TParams extends JsonObject = JsonObject> = {
  /** 沿中心线的归一化位置，范围 [0, 1] */
  offset: number;
  /** 中心线近似总长度（user units） */
  length: number;
  /** 经 paramsSchema 或 JSON 对象校验解析的宽度函数参数；省略 width.params 时从 {} 解析 */
  params: TParams;
};

/**
 * 自定义宽度函数的注册输入，通过 name 在 Ribbon width 中引用
 * @template TParams 宽度函数参数的 JSON 对象类型，关联 paramsSchema 与 widthAt，默认 JsonObject
 */
export type RibbonWidthProfileDefinitionInput<TParams extends JsonObject = JsonObject> = {
  /** 注册表 key，由 IR `width: { kind: "profile", name }` 引用 */
  name: string;
  /**
   * 在采样前解析 width.params 的 JSON 参数 schema；省略时仅校验 JSON 对象结构，不做自定义参数校验
   * @default undefined
   */
  paramsSchema?: ZodType<TParams>;
  /** 在采样位置计算完整流带宽度，单位为 user units；返回值必须有限且非负，可被多次调用 */
  widthAt: (ctx: RibbonWidthProfileContext<TParams>) => number;
};

/** ribbon width profile 定义的擦除形态：registry 存这个 */
export type RibbonWidthProfileDefinition = {
  /** 注册表 key，由 IR `width: { kind: "profile", name }` 引用 */
  name: string;
  /**
   * 在采样前解析 width.params 的 JSON 参数 schema；省略时仅校验 JSON 对象结构，不做自定义参数校验
   * @default undefined
   */
  paramsSchema?: ZodType<JsonObject>;
  /** 在采样位置计算完整流带宽度，单位为 user units；返回值必须有限且非负，可被多次调用 */
  widthAt: (ctx: RibbonWidthProfileContext<JsonObject>) => number;
};
