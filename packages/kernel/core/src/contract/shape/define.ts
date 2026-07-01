import type { IRJsonObject } from '../../schemas/json';
import type { ShapeDefinition, ShapeDefinitionInput } from './types';

/**
 * 定义 shape 注册项，并把参数泛型擦除为 registry 可存储形态。
 * @remarks 当前只集中封装擦除边界；保留入口用于对齐 registry API，并为未来校验或归一化预留空间。
 */
export const defineShape = <TParams extends IRJsonObject>(def: ShapeDefinitionInput<TParams>): ShapeDefinition =>
  def as unknown as ShapeDefinition;
