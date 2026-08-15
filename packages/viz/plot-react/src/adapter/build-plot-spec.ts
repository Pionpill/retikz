import type { IRPlotSpec } from '@retikz/plot';
import type { BuildPlotSpecOptions, PlotAuthoringContext, ResolvedPlotExtensionAuthoring } from '@retikz/plot-vanilla';
import type { ReactNode } from 'react';

import {
  normalizePlotSpec,
  resolvePlotExtensionAuthoring as normalizePlotExtensionAuthoring,
} from '@retikz/plot-vanilla';

import { collectPlotDeclarations } from './collector';

/** 将 React Plot children 收集后交给 Plot Vanilla 归一化 */
export const buildPlotSpec = (children: ReactNode, dataRef: string, options: BuildPlotSpecOptions = {}): IRPlotSpec =>
  normalizePlotSpec(collectPlotDeclarations(children), dataRef, options);

/** 将 React Chart extension children 收集后交给 Plot Vanilla 归一化 */
export const resolvePlotExtensionAuthoring = (
  children: ReactNode,
  context: Omit<PlotAuthoringContext, 'mode'>,
): ResolvedPlotExtensionAuthoring => normalizePlotExtensionAuthoring(collectPlotDeclarations(children), context);
