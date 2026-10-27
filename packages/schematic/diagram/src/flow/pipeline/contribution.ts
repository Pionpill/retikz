import type { CoreProviderContribution } from '@retikz/core';
import { createGraphProviders } from '@retikz/graph';
import { gridLayoutProvider } from '@retikz/layout';
import { legendProvider } from '@retikz/standard/presentation';

import type { FlowDiagramDefinitionOptions } from '../contract';
import { createFlowDiagramProvider, flowDiagramProviderKey } from './composite';

/**
 * 创建 Flow Diagram 及全部 Graph / Foundation 依赖的完整provider contribution
 * @param options 运行时扩展与默认布局选择；省略时使用空配置和内置能力
 * @returns 可交给 Core 编译器的只读 provider 贡献，包含 Flow 根入口及其依赖
 * @description 扩展选项随 provider 保存，在编译组装时解析并校验
 */
export const createFlowDiagramProviderContribution = (
  options: FlowDiagramDefinitionOptions = {},
): CoreProviderContribution =>
  Object.freeze({
    roots: Object.freeze([flowDiagramProviderKey]),
    providers: Object.freeze([
      ...createGraphProviders(options),
      gridLayoutProvider,
      legendProvider,
      createFlowDiagramProvider(options),
    ]),
  });
