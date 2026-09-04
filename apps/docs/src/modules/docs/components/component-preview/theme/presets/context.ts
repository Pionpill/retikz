import type { ChartThemeDefinition } from '@retikz/chart';
import type { ThemeStyleDefinition } from '@retikz/core';
import type { FlowDiagramDefinitionOptions, FlowThemeStyleDefinition } from '@retikz/diagram/flow';
import type { GraphThemeStyleDefinition } from '@retikz/graph';
import type { PlotThemeStyleDefinition } from '@retikz/plot';
import type { TableThemeStyleDefinition } from '@retikz/table';

import { createContext, useContext } from 'react';

import { PreviewChartThemeDefinitions } from './chart';
import { PreviewCoreThemeStyles } from './core';
import { PreviewDiagramThemeStyles, PreviewFlowThemeStyles } from './diagram';
import { PreviewGraphThemeStyles } from './graph';
import { PreviewPlotThemeStyles } from './plot';
import { PreviewTableThemeStyles } from './table';

/** docs reference preset 的 owner-local definition arrays */
export type PreviewThemeDefinitions = Readonly<{
  core: ReadonlyArray<ThemeStyleDefinition>;
  diagram: NonNullable<FlowDiagramDefinitionOptions['diagramThemeStyles']>;
  flow: ReadonlyArray<FlowThemeStyleDefinition>;
  plot: ReadonlyArray<PlotThemeStyleDefinition>;
  chart: ReadonlyArray<ChartThemeDefinition>;
  table: ReadonlyArray<TableThemeStyleDefinition>;
  graph: ReadonlyArray<GraphThemeStyleDefinition>;
}>;

/** docs reference preset 的稳定 definition bundle */
export const PreviewThemeDefinitionBundle: PreviewThemeDefinitions = Object.freeze({
  core: PreviewCoreThemeStyles,
  diagram: PreviewDiagramThemeStyles,
  flow: PreviewFlowThemeStyles,
  plot: PreviewPlotThemeStyles,
  chart: PreviewChartThemeDefinitions,
  table: PreviewTableThemeStyles,
  graph: PreviewGraphThemeStyles,
});

export const PreviewThemeDefinitionsContext = createContext<PreviewThemeDefinitions>(PreviewThemeDefinitionBundle);

/** 读取 embedded Layout 边界需要显式传递的 owner-local definitions */
export const usePreviewThemeDefinitions = (): PreviewThemeDefinitions => useContext(PreviewThemeDefinitionsContext);
