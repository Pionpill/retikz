import type { CoreProviderContribution } from '@retikz/core';

import { createGraphProviders } from '@retikz/graph';
import { LegendProvider } from '@retikz/standard';

import type { FlowDiagramDefinitionOptions } from '../contract';

import { createFlowDiagramProvider, FlowDiagramProviderKey } from './provider';

/** 创建 Flow Diagram 及全部 Graph / Foundation 依赖的完整provider contribution */
export const createFlowDiagramProviderContribution = (
  options: FlowDiagramDefinitionOptions = {},
): CoreProviderContribution =>
  Object.freeze({
    roots: Object.freeze([FlowDiagramProviderKey]),
    providers: Object.freeze([...createGraphProviders(options), LegendProvider, createFlowDiagramProvider(options)]),
  });
