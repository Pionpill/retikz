import type { JsonObject } from '@retikz/foundation';

import type { ShapeDefinition, ShapeDefinitionInput } from './types';

/**
 * 创建可注入编译配置的形状定义，保留定义时的参数类型检查
 * @description 将返回值加入 CompileOptions.shapes 后，节点可通过 shape 引用其 name。此函数不注册形状，也不解析实例参数
 * @template TParams 由 paramsSchema 解析得到的 JSON 对象类型，各形状回调接收同一参数类型
 * @param def 形状名称、参数 schema 与几何及绘制回调
 * @returns 原定义对象，类型转换为可存入形状注册表的 ShapeDefinition；不复制或修改输入
 */
export const defineShape = <TParams extends JsonObject>(def: ShapeDefinitionInput<TParams>): ShapeDefinition =>
  def as unknown as ShapeDefinition;
