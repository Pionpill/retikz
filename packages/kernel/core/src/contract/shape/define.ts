import type { IRJsonObject } from '../../schemas/json';
import type { ShapeDefinition, ShapeDefinitionInput } from './types';

/**
 * 注册一个参数化 shape（定义点 typed，返回擦除形态进 registry）
 * @description 定义点用具体 `TParams` 拿全程类型安全（`paramsSchema` 输出与 5 个计算函数末位 `params` 同型），
 *   返回擦除成 `ShapeDefinition`（所有函数收 `IRJsonObject`）供同构 registry 存放。擦除的单点 cast 封在此处，
 *   **形状实现者不 cast**。含函数与 `paramsSchema`，**不进 IR**——它是 `CompileOptions.shapes` 运行时注入的
 *   TS 对象，符合 IR 100% JSON 可序列化约束（函数只在运行时注入面，不在 IR 字段里）。
 * @remarks 当前 helper 是轻量泛型擦除边界，不做额外运行时校验；保留该稳定入口是为了与其它 `defineXxx()`
 *   API 对齐，并为未来添加运行时校验、默认值归一或泛型收敛预留扩展点。
 * @param def shape 定义（paramsSchema / circumscribe / boundaryPoint / anchor / edgePoint? / emit）
 * @returns 擦除成 `ShapeDefinition` 的同一份 def（便于 `export const sector = defineShape({ ... })`）
 */
export const defineShape = <TParams extends IRJsonObject>(def: ShapeDefinitionInput<TParams>): ShapeDefinition =>
  def as unknown as ShapeDefinition;
