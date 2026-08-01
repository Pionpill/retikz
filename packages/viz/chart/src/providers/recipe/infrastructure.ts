import type { IRPlotSpec } from '@retikz/plot';

import { DataSortOrder, DataTransform } from '@retikz/data';
import {
  Cartesian2DSchema,
  PLOT_NAMESPACE,
  PlotComposite,
  PlotCoordinate,
  PlotGuide,
  PlotMark,
  PlotScale,
  PointMarkSchema,
} from '@retikz/plot';

import type { InfrastructureChartSpec } from '../../schemas';
import type { ChartRecipe, ChartRecipeSeed } from './types';

import { ChartInspectionMemberKind, InfrastructureChartSpecSchema, InfrastructureChartType } from '../../schemas';
import { ChartRecipeInvariantError, ChartRecipeInvariantReason } from './invariant';

const recipeId = (target: string): string => `__chart.${InfrastructureChartType}.${target}`;

/** 从私有 fixture 输入建立 resolver 消费的不可变 recipe seed */
const createInfrastructureSeed = (spec: InfrastructureChartSpec): ChartRecipeSeed => {
  const transform = { kind: DataTransform.Sort, field: spec.encoding.x, order: DataSortOrder.Ascending } as const;
  const scaleX = { type: PlotScale.Linear, name: 'x' } as const;
  const scaleY = { type: PlotScale.Linear, name: 'y' } as const;
  const coordinate = { type: PlotCoordinate.Cartesian2D, x: 'x', y: 'y' } as const;
  const mark = {
    type: PlotMark.Point,
    id: recipeId('mark.main'),
    encoding: { x: { field: spec.encoding.x }, y: { field: spec.encoding.y } },
  } as const;
  const guideX = {
    type: PlotGuide.Axis,
    id: recipeId('guide.x'),
    dimension: 'x',
  } as const;
  const guideY = {
    type: PlotGuide.Axis,
    id: recipeId('guide.y'),
    dimension: 'y',
    grid: true,
  } as const;
  const plot: IRPlotSpec = {
    namespace: PLOT_NAMESPACE,
    type: PlotComposite.Plot,
    ...(spec.id === undefined ? {} : { id: `${spec.id}/plot` }),
    data: spec.data,
    transform: [transform],
    scales: [scaleX, scaleY],
    coordinate,
    marks: [mark],
    guides: [guideX, guideY],
    ...(spec.theme === undefined ? {} : { theme: spec.theme }),
    ...(spec.layout === undefined ? {} : { layout: spec.layout }),
    ...(spec.width === undefined ? {} : { width: spec.width }),
    ...(spec.height === undefined ? {} : { height: spec.height }),
    ...(spec.meta === undefined ? {} : { meta: spec.meta }),
  };

  return {
    plot,
    members: [
      {
        target: 'transform.order-x',
        kind: ChartInspectionMemberKind.Transform,
        core: true,
        value: transform,
        plotPath: ['transform', 0],
        patchablePaths: [],
        sourcePath: '$recipe/__infrastructure-fixture/transform.order-x',
      },
      {
        target: 'scale.x',
        kind: ChartInspectionMemberKind.Scale,
        core: true,
        value: scaleX,
        plotPath: ['scales', 0],
        patchablePaths: [],
        sourcePath: '$recipe/__infrastructure-fixture/scale.x',
      },
      {
        target: 'scale.y',
        kind: ChartInspectionMemberKind.Scale,
        core: true,
        value: scaleY,
        plotPath: ['scales', 1],
        patchablePaths: [],
        sourcePath: '$recipe/__infrastructure-fixture/scale.y',
      },
      {
        target: 'coordinate.main',
        kind: ChartInspectionMemberKind.Coordinate,
        core: true,
        value: coordinate,
        plotPath: ['coordinate'],
        patchablePaths: [],
        sourcePath: '$recipe/__infrastructure-fixture/coordinate.main',
      },
      {
        target: 'mark.main',
        kind: ChartInspectionMemberKind.Mark,
        core: true,
        value: mark,
        plotPath: ['marks', 0],
        patchablePaths: [['size'], ['opacity']],
        sourcePath: '$recipe/__infrastructure-fixture/mark.main',
      },
      {
        target: 'guide.x',
        kind: ChartInspectionMemberKind.Guide,
        core: false,
        value: guideX,
        plotPath: ['guides', 0],
        patchablePaths: [['grid']],
        sourcePath: '$recipe/__infrastructure-fixture/guide.x',
      },
      {
        target: 'guide.y',
        kind: ChartInspectionMemberKind.Guide,
        core: false,
        value: guideY,
        plotPath: ['guides', 1],
        patchablePaths: [['grid']],
        sourcePath: '$recipe/__infrastructure-fixture/guide.y',
      },
    ],
    patches: [
      ...(spec.mark === undefined
        ? []
        : [
            {
              target: 'mark.main',
              inputPath: ['mark'],
              sourcePath: '$spec/mark',
              changes: [
                ...(spec.mark.size === undefined ? [] : [{ path: ['size'], value: spec.mark.size }]),
                ...(spec.mark.opacity === undefined ? [] : [{ path: ['opacity'], value: spec.mark.opacity }]),
              ],
            },
          ]),
      ...(spec.components ?? []).map((component, index) => ({
        target: component.target,
        inputPath: ['components', index],
        sourcePath: `$spec/components/${index}`,
        changes: [{ path: ['grid'], value: component.grid }],
      })),
    ],
  };
};

/** 验证 merge 后的 PlotSpec 仍保留 fixture 的不可撤销语义 */
const validateInfrastructureCore = (spec: InfrastructureChartSpec, plotSpec: IRPlotSpec): void => {
  const requiredTransform = plotSpec.transform?.at(-1);
  if (
    requiredTransform?.kind !== DataTransform.Sort ||
    requiredTransform.field !== spec.encoding.x ||
    requiredTransform.order !== DataSortOrder.Ascending
  ) {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.RequiredTransform, ['transform']);
  }

  if (!plotSpec.scales.some(scale => scale.name === 'x') || !plotSpec.scales.some(scale => scale.name === 'y')) {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.RequiredScale, ['scales']);
  }

  if (plotSpec.composition !== undefined) {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.SpatialRoot, ['composition']);
  }
  const coordinate = Cartesian2DSchema.safeParse(plotSpec.coordinate);
  if (!coordinate.success || coordinate.data.x !== 'x' || coordinate.data.y !== 'y') {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.SpatialRoot, ['coordinate']);
  }

  const mainMark = PointMarkSchema.safeParse(plotSpec.marks.find(candidate => candidate.id === recipeId('mark.main')));
  if (
    !mainMark.success ||
    mainMark.data.encoding.x?.field !== spec.encoding.x ||
    mainMark.data.encoding.y?.field !== spec.encoding.y
  ) {
    throw new ChartRecipeInvariantError(ChartRecipeInvariantReason.CoreMark, ['marks']);
  }
};

/** 私有基础设施 fixture recipe */
export const InfrastructureChartRecipe: ChartRecipe<InfrastructureChartSpec> = {
  type: InfrastructureChartType,
  schema: InfrastructureChartSpecSchema,
  createSeed: createInfrastructureSeed,
  validateCore: validateInfrastructureCore,
};
