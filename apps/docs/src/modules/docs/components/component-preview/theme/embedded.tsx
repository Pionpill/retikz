import type { EntityProps, GraphProps, RelationProps } from '@retikz/graph-react';
import type { PlotProps } from '@retikz/plot-react';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { DetailTableProps, InputEmbeddableTableComponent, ManualTableProps } from '@retikz/table-react';
import type { FC } from 'react';

import { Entity as RuntimeEntity, Graph as RuntimeGraph, Relation as RuntimeRelation } from '@retikz/graph-react';
import { Plot as RuntimePlot } from '@retikz/plot-react';
import { DetailTable as RuntimeDetailTable, ManualTable as RuntimeManualTable } from '@retikz/table-react';

import { PreviewGraphThemeStyles } from './presets/graph';
import { PreviewPlotThemeStyles } from './presets/plot';
import { PreviewTableThemeStyles } from './presets/table';

/** 只为绕过 React context 的 Layout-embedded adapter 补齐 docs Plot definitions */
const withPlotThemeStyles = (props: PlotProps): PlotProps => ({
  ...props,
  plotThemeStyles:
    props.plotThemeStyles === undefined
      ? PreviewPlotThemeStyles
      : [...PreviewPlotThemeStyles, ...props.plotThemeStyles],
});

const runtimePlotAdapter = RuntimePlot.inputEmbedAdapter;

/** docs preview 的 Plot 边界，同时覆盖 standalone 与 Layout-embedded runtime definitions */
export const PreviewPlot = Object.assign(((props: PlotProps) => <RuntimePlot {...props} />) as FC<PlotProps>, {
  displayName: 'PreviewPlot',
  isTier2Embeddable: true as const,
  inputEmbedAdapter: runtimePlotAdapter,
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) =>
    RuntimePlot.createInputEmbedProps(withPlotThemeStyles(props as PlotProps)),
});

const withGraphThemeStyles = <TProps extends { graphThemeStyles?: GraphProps['graphThemeStyles'] }>(
  props: TProps,
): TProps => ({
  ...props,
  graphThemeStyles:
    props.graphThemeStyles === undefined
      ? PreviewGraphThemeStyles
      : [...PreviewGraphThemeStyles, ...props.graphThemeStyles],
});

/** docs preview 的 Graph 边界，显式覆盖 Layout-embedded runtime definitions */
export const PreviewGraph: typeof RuntimeGraph = Object.assign(
  ((props: GraphProps) => <RuntimeGraph {...props} />) as FC<GraphProps>,
  {
    displayName: 'PreviewGraph',
    isTier2Embeddable: true as const,
    inputEmbedAdapter: RuntimeGraph.inputEmbedAdapter,
    createInputEmbedProps: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) =>
      RuntimeGraph.createInputEmbedProps?.(withGraphThemeStyles(props as GraphProps), context),
  },
);

/** docs preview 的 Entity 边界，显式覆盖 Layout-embedded runtime definitions */
export const PreviewEntity: typeof RuntimeEntity = Object.assign(
  ((props: EntityProps) => <RuntimeEntity {...props} />) as FC<EntityProps>,
  {
    displayName: 'PreviewEntity',
    isTier2Embeddable: true as const,
    inputEmbedAdapter: RuntimeEntity.inputEmbedAdapter,
    createInputEmbedProps: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) =>
      RuntimeEntity.createInputEmbedProps?.(withGraphThemeStyles(props as EntityProps), context),
  },
);

/** docs preview 的 Relation 边界，显式覆盖 Layout-embedded runtime definitions */
export const PreviewRelation: typeof RuntimeRelation = Object.assign(
  ((props: RelationProps) => <RuntimeRelation {...props} />) as FC<RelationProps>,
  {
    displayName: 'PreviewRelation',
    isTier2Embeddable: true as const,
    inputEmbedAdapter: RuntimeRelation.inputEmbedAdapter,
    createInputEmbedProps: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) =>
      RuntimeRelation.createInputEmbedProps?.(withGraphThemeStyles(props as RelationProps), context),
  },
);

/** 只为绕过 React context 的 Layout-embedded adapter 补齐 docs Table definitions */
const withTableThemeStyles = <TProps extends { tableThemeStyles?: DetailTableProps['tableThemeStyles'] }>(
  props: TProps,
): TProps => ({
  ...props,
  tableThemeStyles:
    props.tableThemeStyles === undefined
      ? PreviewTableThemeStyles
      : [...PreviewTableThemeStyles, ...props.tableThemeStyles],
});

/** docs preview 的 DetailTable 边界 */
export const PreviewDetailTable: InputEmbeddableTableComponent<DetailTableProps> = Object.assign(
  ((props: DetailTableProps) => <RuntimeDetailTable {...props} />) as FC<DetailTableProps>,
  {
    displayName: 'PreviewDetailTable',
    isTier2Embeddable: true as const,
    inputEmbedAdapter: RuntimeDetailTable.inputEmbedAdapter,
    createInputEmbedProps: (props: Readonly<Record<string, unknown>>) =>
      RuntimeDetailTable.createInputEmbedProps(withTableThemeStyles(props as DetailTableProps)),
  },
);

/** docs preview 的 ManualTable 边界 */
export const PreviewManualTable: InputEmbeddableTableComponent<ManualTableProps> = Object.assign(
  ((props: ManualTableProps) => <RuntimeManualTable {...props} />) as FC<ManualTableProps>,
  {
    displayName: 'PreviewManualTable',
    isTier2Embeddable: true as const,
    inputEmbedAdapter: RuntimeManualTable.inputEmbedAdapter,
    createInputEmbedProps: (props: Readonly<Record<string, unknown>>) =>
      RuntimeManualTable.createInputEmbedProps(withTableThemeStyles(props as ManualTableProps)),
  },
);
