import type { CoreDependencyProvider } from '@retikz/core';

import type { FlowDiagramDefinitionOptions } from '../contract';
import type { ResolvedFlowDiagramDefinitionOptions } from './options';

import { resolveFlowDiagramDefinitionOptions } from './options';

const FlowDiagramRuntimeOptions = Symbol('retikz.diagram.flow.runtimeOptions');
const FLOW_DIAGRAM_RUNTIME_REFERENCE_PREFIX = '@@retikz/diagram/flow/runtime/';

type FlowDiagramRuntimeEnvelope = Readonly<{
  [FlowDiagramRuntimeOptions]: FlowDiagramDefinitionOptions;
}>;

let flowDiagramRuntimeReferenceSeed = 0;

const runtimeOptionsOf = (value: unknown): FlowDiagramDefinitionOptions | undefined => {
  if (value === null || typeof value !== 'object' || !(FlowDiagramRuntimeOptions in value)) return undefined;
  return (value as FlowDiagramRuntimeEnvelope)[FlowDiagramRuntimeOptions];
};
/** 为一个 Flow Diagram contribution 创建 compile-local options dataset */
export const createFlowDiagramRuntimeDatasets = (
  options: FlowDiagramDefinitionOptions,
): CoreDependencyProvider['datasets'] => {
  const reference = `${FLOW_DIAGRAM_RUNTIME_REFERENCE_PREFIX}${flowDiagramRuntimeReferenceSeed}`;
  flowDiagramRuntimeReferenceSeed += 1;
  return Object.freeze({
    [reference]: Object.freeze({ [FlowDiagramRuntimeOptions]: options }),
  });
};

/** 从 Core 合并后的 datasets 解析同一次 Flow Diagram assembly */
export const resolveFlowDiagramRuntimeOptions = (
  datasets: Readonly<Record<string, unknown>>,
): ResolvedFlowDiagramDefinitionOptions => {
  const optionSets = Object.values(datasets).flatMap(value => {
    const options = runtimeOptionsOf(value);
    return options === undefined ? [] : [options];
  });
  return resolveFlowDiagramDefinitionOptions(optionSets);
};
