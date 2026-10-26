import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from './options';
import { mergeGraphDefinitionOptions, resolveGraphDefinitionOptions } from './options';

/** 合并提供者参数并解析当前装配的 Graph 注册表 */
export const resolveGraphRuntimeOptions = (
  contributions: ReadonlyArray<GraphDefinitionOptions>,
): ResolvedGraphDefinitionOptions => resolveGraphDefinitionOptions(mergeGraphDefinitionOptions(contributions));
