import { RetikzDataError } from '../error';
import type { FieldCollector } from '../model';
import type { AnyTransformDefinition, TransformSemanticContext } from './contract';
import { resolveTransformRegistry } from './definitions';
import type { IRDataTransform } from './types';

/**
 * 从唯一语义模型投影派生字段，供宿主 strict 引用检查
 * @param transform 待分析的变换操作
 * @param fields 接收输入字段名的收集器
 * @param derivedOutputs 接收派生字段名的集合，会就地更新
 * @param registry 变换定义注册表；省略时使用内置定义
 * @param semantic 统计定义与可选输入模型；省略时使用空模型
 * @throws {RetikzDataError} 变换未注册、参数解析或字段语义回调失败
 */
export const collectTransformFields = (
  transform: IRDataTransform,
  fields: FieldCollector,
  derivedOutputs: Set<string>,
  registry: ReadonlyMap<string, AnyTransformDefinition> = resolveTransformRegistry(),
  semantic: Omit<TransformSemanticContext, 'model'> & Partial<Pick<TransformSemanticContext, 'model'>> = {},
): void => {
  const definition = registry.get(transform.kind);
  if (definition === undefined) throw new RetikzDataError(`data: transform "${transform.kind}" is not registered`);

  const operation = definition.schema.parse(transform) as never;
  const context = { ...semantic, model: semantic.model ?? [] };
  fields.addFields(...(definition.inputFields?.(operation, context) ?? []));
  const output = definition.outputModel(operation, context);

  for (const descriptor of output.kind === 'preserve' ? output.outputs : output.fields) {
    if (
      output.kind === 'preserve' ||
      descriptor.type === undefined ||
      typeof descriptor.type === 'string' ||
      descriptor.type.from !== descriptor.field
    )
      derivedOutputs.add(descriptor.field);
  }
};
