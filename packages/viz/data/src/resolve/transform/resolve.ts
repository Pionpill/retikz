import type {
  AnyTransformDefinition,
  DataTransformModel,
  DataTransformOutputModel,
  DataTransformResolution,
  TransformSemanticContext,
} from '../../contract';
import { RetikzDataError } from '../../error';
import {
  resolveRegressionRegistry,
  resolveRowSelectorRegistry,
  resolveStatisticsReducerRegistry,
  resolveTransformRegistry,
} from '../../providers';
import type { IRDataExecution, IRDataTransformDeclaration } from '../../schemas';

/** 已经由各 Definition 唯一解析的声明；仅在当前请求内消费 */
export type ParsedDataTransformDeclaration = Readonly<{
  definition: AnyTransformDefinition;
  declaration: IRDataTransformDeclaration;
}>;

/** 只解析作者参数，后续模型解析和计算不再重跑 schema */
export const parseDataTransformDeclarations = (
  declarations: ReadonlyArray<IRDataTransformDeclaration>,
  registry: ReadonlyMap<string, AnyTransformDefinition>,
): Array<ParsedDataTransformDeclaration> =>
  declarations.map((declaration, operationIndex) => {
    const definition = registry.get(declaration.operation.kind);
    if (definition === undefined)
      throw new RetikzDataError(`data: transform "${declaration.operation.kind}" is not registered`, {
        operationIndex,
      });
    try {
      return { definition, declaration: { ...declaration, operation: definition.schema.parse(declaration.operation) } };
    } catch (cause) {
      throw new RetikzDataError(`data: transform at index ${operationIndex} could not be parsed`, {
        cause,
        operationIndex,
      });
    }
  });

/** 解析时使用的语义定义集合 */
export type DataTransformResolveOptions = Omit<TransformSemanticContext, 'model'> &
  Readonly<{
    /** 内置与用户 Definition 的唯一注册表 */
    transformRegistry?: ReadonlyMap<string, AnyTransformDefinition>;
  }>;

/** 从唯一 outputModel 推进完整字段模型 */
export const resolveDataTransformOutputModel = (
  input: DataTransformModel,
  output: DataTransformOutputModel,
): DataTransformModel => {
  const fields =
    output.kind === 'preserve'
      ? new Map(input.map(field => [field.name, field]))
      : new Map<string, DataTransformModel[number]>();
  const descriptors = output.kind === 'preserve' ? output.outputs : output.fields;
  const seen = new Set<string>();
  for (const descriptor of descriptors) {
    if (seen.has(descriptor.field)) throw new RetikzDataError(`data: duplicate output field "${descriptor.field}"`);
    seen.add(descriptor.field);
    let source: DataTransformModel[number] | undefined;
    if (descriptor.type !== undefined && typeof descriptor.type !== 'string') {
      const sourceName = descriptor.type.from;
      source = input.find(field => field.name === sourceName);
      if (source === undefined)
        throw new RetikzDataError(`data: output references unknown field "${descriptor.type.from}"`);
    }
    const type = typeof descriptor.type === 'string' ? descriptor.type : source?.type;
    fields.set(descriptor.field, {
      name: descriptor.field,
      ...(type === undefined ? {} : { type }),
      ...(source?.order === undefined ? {} : { order: source.order }),
    });
  }
  return [...fields.values()];
};

/** 逐声明解析全部语义和统计依赖，不读取 rows 或查询引擎 */
export const resolveParsedDataTransforms = (
  declarations: ReadonlyArray<ParsedDataTransformDeclaration>,
  inputModel: DataTransformModel,
  options: DataTransformResolveOptions = {},
): DataTransformResolution => {
  let model = inputModel;
  const stages = declarations.map(({ definition, declaration }, operationIndex) => {
    try {
      const operation = declaration.operation;
      const context: TransformSemanticContext = {
        model,
        statisticsReducerRegistry: options.statisticsReducerRegistry ?? resolveStatisticsReducerRegistry(),
        rowSelectorRegistry: options.rowSelectorRegistry ?? resolveRowSelectorRegistry(),
        regressionRegistry: options.regressionRegistry ?? resolveRegressionRegistry(),
      };
      for (const field of definition.inputFields?.(operation as never, context) ?? []) {
        if (!model.some(candidate => candidate.name === field))
          throw new RetikzDataError(`data: missing input field "${field}"`);
      }
      definition.validate?.(operation as never, context);
      const dependencies = definition.dependencies?.(operation as never, context) ?? [];
      model = resolveDataTransformOutputModel(model, definition.outputModel(operation as never, context));
      return {
        definition,
        operation,
        dependencies,
        outputModel: model,
        ...(declaration.dataExecution === undefined ? {} : { dataExecution: declaration.dataExecution }),
      };
    } catch (cause) {
      throw new RetikzDataError(
        `data: transform at index ${operationIndex} could not be resolved${cause instanceof RetikzDataError ? `: ${cause.message}` : ''}`,
        { cause, operationIndex },
      );
    }
  });
  return { inputModel, stages };
};

/** 公开纯语义入口，按精确 schema 一次解析并逐阶段推进模型 */
export const resolveDataTransforms = (
  declarations: ReadonlyArray<IRDataTransformDeclaration>,
  inputModel: DataTransformModel,
  options: DataTransformResolveOptions = {},
): DataTransformResolution =>
  resolveParsedDataTransforms(
    parseDataTransformDeclarations(declarations, options.transformRegistry ?? resolveTransformRegistry()),
    inputModel,
    options,
  );

/** 分别继承 mode/external，完整继承后才补 builtin 默认 */
export const resolveDataExecution = (
  defaults?: IRDataExecution,
  root?: IRDataExecution,
  declaration?: IRDataExecution,
): Required<Pick<IRDataExecution, 'mode'>> & Pick<IRDataExecution, 'external'> => ({
  mode: declaration?.mode ?? root?.mode ?? defaults?.mode ?? 'builtin',
  external: declaration?.external ?? root?.external ?? defaults?.external,
});
