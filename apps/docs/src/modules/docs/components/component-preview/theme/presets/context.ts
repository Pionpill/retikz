import type { ChartThemeStyleDefinition } from '@retikz/chart';
import type { ThemeStyleDefinition } from '@retikz/core';
import type { GraphThemeStyleDefinition } from '@retikz/graph';
import type { PlotThemeStyleDefinition } from '@retikz/plot';
import type { TableThemeStyleDefinition } from '@retikz/table';

import { createContext, useContext } from 'react';

import { PreviewChartThemeStyles } from './chart';
import { PreviewCoreThemeStyles } from './core';
import { PreviewGraphThemeStyles } from './graph';
import { PreviewPlotThemeStyles } from './plot';
import { PreviewTableThemeStyles } from './table';

/** docs reference preset 的 owner-local definition arrays */
export type PreviewThemeDefinitions = Readonly<{
  core: ReadonlyArray<ThemeStyleDefinition>;
  plot: ReadonlyArray<PlotThemeStyleDefinition>;
  chart: ReadonlyArray<ChartThemeStyleDefinition>;
  table: ReadonlyArray<TableThemeStyleDefinition>;
  graph: ReadonlyArray<GraphThemeStyleDefinition>;
}>;

/** docs reference preset 的稳定 definition bundle */
export const PreviewThemeDefinitionBundle: PreviewThemeDefinitions = Object.freeze({
  core: PreviewCoreThemeStyles,
  plot: PreviewPlotThemeStyles,
  chart: PreviewChartThemeStyles,
  table: PreviewTableThemeStyles,
  graph: PreviewGraphThemeStyles,
});

export const PreviewThemeDefinitionsContext = createContext<PreviewThemeDefinitions>(PreviewThemeDefinitionBundle);

/** 读取 embedded Layout 边界需要显式传递的 owner-local definitions */
export const usePreviewThemeDefinitions = (): PreviewThemeDefinitions => useContext(PreviewThemeDefinitionsContext);
