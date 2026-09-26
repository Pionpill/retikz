import type { JsonObject } from '@retikz/foundation';

import type { BoundaryDefinition, BoundaryDefinitionInput } from './types';

/**
 * 创建可注入编译配置的连接面定义，保留定义时的参数类型检查
 * @description 将返回值加入 CompileOptions.boundaries 后，节点或路径端点可通过 boundary 引用其 name。此函数不注册连接面，也不解析实例参数
 * @template TParams 由 paramsSchema 解析得到的 JSON 对象类型，各连接面回调接收同一参数类型
 * @param def 连接面名称、参数 schema 与连接几何回调
 * @returns 原定义对象，类型转换为可存入连接面注册表的 BoundaryDefinition；不复制或修改输入
 */
export const defineBoundary = <TParams extends JsonObject>(def: BoundaryDefinitionInput<TParams>): BoundaryDefinition =>
  def as unknown as BoundaryDefinition;
