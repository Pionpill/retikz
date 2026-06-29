import type { IRJsonObject } from '../../schemas/json';
import type { BoundaryDefinition, BoundaryDefinitionInput } from './types';

/**
 * 注册一个参数化 connection surface（定义点 typed，返回擦除形态进 registry）。
 * @description boundary definition 含函数与 paramsSchema，不进 IR；IR 只保存 boundary 名或 `{ type, params }`。
 */
export const defineBoundary = <TParams extends IRJsonObject>(
  def: BoundaryDefinitionInput<TParams>,
): BoundaryDefinition => def as unknown as BoundaryDefinition;
