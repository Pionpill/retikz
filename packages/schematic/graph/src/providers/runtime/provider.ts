import type { CoreDependencyProvider } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from './options';

import { mergeGraphDefinitionOptions, resolveGraphDefinitionOptions } from './options';

const GraphRuntimeOptions = Symbol('retikz.graph.runtimeOptions');
const GraphRuntimeReferencePrefix = '@@retikz/graph/runtime/';

type GraphRuntimeEnvelope = Readonly<{
  [GraphRuntimeOptions]: GraphDefinitionOptions;
}>;

let graphRuntimeReferenceSeed = 0;

/** 识别 Graph provider-local options envelope */
const runtimeOptionsOf = (value: unknown): GraphDefinitionOptions | undefined => {
  if (value === null || typeof value !== 'object' || !(GraphRuntimeOptions in value)) return undefined;
  return (value as GraphRuntimeEnvelope)[GraphRuntimeOptions];
};

/** 为单个 Graph provider contribution 创建不进入 IR 的局部 options dataset */
export const createGraphRuntimeDatasets = (options: GraphDefinitionOptions): CoreDependencyProvider['datasets'] => {
  const reference = `${GraphRuntimeReferencePrefix}${graphRuntimeReferenceSeed}`;
  graphRuntimeReferenceSeed += 1;
  const envelope: GraphRuntimeEnvelope = Object.freeze({ [GraphRuntimeOptions]: options });
  return Object.freeze({ [reference]: envelope });
};

/** 从 Core 已合并的 datasets 恢复并解析一次 assembly 的 Graph registries */
export const resolveGraphRuntimeOptions = (
  datasets: Readonly<Record<string, unknown>>,
): ResolvedGraphDefinitionOptions => {
  const optionSets: Array<GraphDefinitionOptions> = [];
  for (const value of Object.values(datasets)) {
    const options = runtimeOptionsOf(value);
    if (options !== undefined) optionSets.push(options);
  }
  return resolveGraphDefinitionOptions(mergeGraphDefinitionOptions(optionSets));
};
