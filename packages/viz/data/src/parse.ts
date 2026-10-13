import type { DataTransformModel } from './model';
import type { DataTransformResolution, DataTransformResolveOptions, IRDataTransformDeclaration } from './transform';
import { parseDataTransformDeclarations, resolveParsedDataTransforms, resolveTransformRegistry } from './transform';

/**
 * 公开纯语义入口，按精确 schema 一次解析并逐阶段推进模型
 * @param declarations 按执行顺序排列的变换声明
 * @param inputModel 首阶段可见的完整字段模型
 * @param options 请求内的语义注册表；省略时使用内置定义
 * @returns 包含全部阶段、精确操作与预期输出模型的计划，不计算行数据
 * @throws {RetikzDataError} 变换未注册、参数无效、输入字段缺失或语义回调失败
 */
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
