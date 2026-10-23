import type { ChartThemeDefinition } from '@retikz/chart';
import type { ThemeDefinition } from '@retikz/core';
import type { FlowDiagramDefinitionOptions, FlowThemeDefinition } from '@retikz/diagram/flow';
import type { GraphThemeDefinition } from '@retikz/graph';
import type { EntityKindDefinition, RelationKindDefinition } from '@retikz/graph';
import type { PlotThemeDefinition } from '@retikz/plot';
import type { TableThemeDefinition } from '@retikz/table';
import { createContext, useContext } from 'react';

import {
  logicFigureCoreTheme,
  logicFigureDiagramTheme,
  logicFigureEntityDefinitions,
  logicFigureFlowTheme,
  logicFigureGraphTheme,
  logicFigureRelationKinds,
} from '../../../logic-figure';
import { PreviewChartThemeDefinitions } from './chart';
import { PreviewCoreThemeDefinitions } from './core';
import { PreviewPlotThemeDefinitions } from './plot';
import { PreviewTableThemeDefinitions } from './table';

/** docs reference preset 的 owner-local definition arrays */
export type PreviewThemeDefinitions = Readonly<{
  core: ReadonlyArray<ThemeDefinition>;
  diagram: NonNullable<FlowDiagramDefinitionOptions['diagramThemeDefinitions']>;
  flow: ReadonlyArray<FlowThemeDefinition>;
  plot: ReadonlyArray<PlotThemeDefinition>;
  chart: ReadonlyArray<ChartThemeDefinition>;
  table: ReadonlyArray<TableThemeDefinition>;
  graph: ReadonlyArray<GraphThemeDefinition>;
  graphEntityKinds: ReadonlyArray<EntityKindDefinition>;
  graphRelationKinds: ReadonlyArray<RelationKindDefinition>;
}>;

/** docs reference preset 的稳定 definition bundle */
export const PreviewThemeDefinitionBundle: PreviewThemeDefinitions = Object.freeze({
  core: [...PreviewCoreThemeDefinitions, logicFigureCoreTheme],
  diagram: [logicFigureDiagramTheme],
  flow: [logicFigureFlowTheme],
  plot: PreviewPlotThemeDefinitions,
  chart: PreviewChartThemeDefinitions,
  table: PreviewTableThemeDefinitions,
  graph: [logicFigureGraphTheme],
  graphEntityKinds: logicFigureEntityDefinitions,
  graphRelationKinds: logicFigureRelationKinds,
});

export const PreviewThemeDefinitionsContext = createContext<PreviewThemeDefinitions>(PreviewThemeDefinitionBundle);

/** 读取 embedded Layout 边界需要显式传递的 owner-local definitions */
export const usePreviewThemeDefinitions = (): PreviewThemeDefinitions => useContext(PreviewThemeDefinitionsContext);
