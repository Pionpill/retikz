import { BranchDiagram as RuntimeBranchDiagram } from '@retikz/diagram-react/branch';
import type { BranchDiagramProps } from '@retikz/diagram-react/branch';
import type { FlowDiagramProps } from '@retikz/diagram-react/flow';
import { FlowDiagram as RuntimeFlowDiagram } from '@retikz/diagram-react/flow';
import type { EntityProps, GraphProps, RelationProps } from '@retikz/graph-react';
import { Entity as RuntimeEntity, Graph as RuntimeGraph, Relation as RuntimeRelation } from '@retikz/graph-react';
import type { PlotProps } from '@retikz/plot-react';
import { Plot as RuntimePlot } from '@retikz/plot-react';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { DetailTableProps, InputEmbeddableTableComponent, ManualTableProps } from '@retikz/table-react';
import { DetailTable as RuntimeDetailTable, ManualTable as RuntimeManualTable } from '@retikz/table-react';
import type { FC } from 'react';

import { PreviewThemeDefinitionBundle } from './presets/context';
import { PreviewPlotThemeDefinitions } from './presets/plot';
import { PreviewTableThemeDefinitions } from './presets/table';

/** 只为绕过 React context 的 Layout-embedded adapter 补齐 docs Plot definitions */
const withPlotThemeDefinitions = (props: PlotProps): PlotProps => ({
  ...props,
  definitions: {
    ...props.definitions,
    plotThemeDefinitions:
      props.definitions?.plotThemeDefinitions === undefined
        ? PreviewPlotThemeDefinitions
        : [...PreviewPlotThemeDefinitions, ...props.definitions.plotThemeDefinitions],
  },
});

const runtimePlotAdapter = RuntimePlot.inputEmbedAdapter;

/** docs preview 的 Plot 边界，同时覆盖 standalone 与 Layout-embedded runtime definitions */
export const PreviewPlot = Object.assign(((props: PlotProps) => <RuntimePlot {...props} />) as FC<PlotProps>, {
  displayName: 'PreviewPlot',
  isTier2Embeddable: true as const,
  inputEmbedAdapter: runtimePlotAdapter,
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) =>
    RuntimePlot.createInputEmbedProps(withPlotThemeDefinitions(props as PlotProps)),
});

const withGraphThemeDefinitions = (props: GraphProps): GraphProps => ({
  ...props,
  graphThemeDefinitions:
    props.graphThemeDefinitions === undefined
      ? PreviewThemeDefinitionBundle.graph
      : [...new Set([...PreviewThemeDefinitionBundle.graph, ...props.graphThemeDefinitions])],
});

/** docs preview 的 Graph 边界，显式覆盖 Layout-embedded runtime definitions */
export const PreviewGraph: typeof RuntimeGraph = Object.assign(
  ((props: GraphProps) => <RuntimeGraph {...props} />) as FC<GraphProps>,
  {
    displayName: 'PreviewGraph',
    isTier2Embeddable: true as const,
    inputEmbedAdapter: RuntimeGraph.inputEmbedAdapter,
    createInputEmbedProps: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) =>
      RuntimeGraph.createInputEmbedProps?.(withGraphThemeDefinitions(props as GraphProps), context),
  },
);

/** docs preview 的 Entity 边界，沿用 Graph 装配的 definitions */
export const PreviewEntity: typeof RuntimeEntity = Object.assign(
  ((props: EntityProps) => <RuntimeEntity {...props} />) as FC<EntityProps>,
  {
    displayName: 'PreviewEntity',
    isTier2Embeddable: true as const,
    inputEmbedAdapter: RuntimeEntity.inputEmbedAdapter,
    createInputEmbedProps: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) =>
      RuntimeEntity.createInputEmbedProps?.(props, context),
  },
);

/** docs preview 的 Relation 边界，沿用 Graph 装配的 definitions */
export const PreviewRelation: typeof RuntimeRelation = Object.assign(
  ((props: RelationProps) => <RuntimeRelation {...props} />) as FC<RelationProps>,
  {
    displayName: 'PreviewRelation',
    isTier2Embeddable: true as const,
    inputEmbedAdapter: RuntimeRelation.inputEmbedAdapter,
    createInputEmbedProps: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) =>
      RuntimeRelation.createInputEmbedProps?.(props, context),
  },
);

const withFlowThemeDefinitions = (props: FlowDiagramProps): FlowDiagramProps => ({
  ...props,
  diagramThemeDefinitions:
    props.diagramThemeDefinitions === undefined
      ? PreviewThemeDefinitionBundle.diagram
      : [...PreviewThemeDefinitionBundle.diagram, ...props.diagramThemeDefinitions],
  flowThemeDefinitions:
    props.flowThemeDefinitions === undefined
      ? PreviewThemeDefinitionBundle.flow
      : [...PreviewThemeDefinitionBundle.flow, ...props.flowThemeDefinitions],
  graphThemeDefinitions:
    props.graphThemeDefinitions === undefined
      ? PreviewThemeDefinitionBundle.graph
      : [...new Set([...PreviewThemeDefinitionBundle.graph, ...props.graphThemeDefinitions])],
});

/** docs preview 的 FlowDiagram 边界，显式覆盖全部同名 Theme definitions */
export const PreviewFlowDiagram: typeof RuntimeFlowDiagram = Object.assign(
  ((props: FlowDiagramProps) => <RuntimeFlowDiagram {...withFlowThemeDefinitions(props)} />) as FC<FlowDiagramProps>,
  {
    displayName: 'PreviewFlowDiagram',
    isTier2Embeddable: true as const,
    inputEmbedAdapter: RuntimeFlowDiagram.inputEmbedAdapter,
    createInputEmbedProps: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) =>
      RuntimeFlowDiagram.createInputEmbedProps(withFlowThemeDefinitions(props as FlowDiagramProps), context),
  },
);

/** 只为绕过 React context 的 Layout-embedded adapter 补齐 docs Table definitions */
const withTableThemeDefinitions = <
  TProps extends { tableThemeDefinitions?: DetailTableProps['tableThemeDefinitions'] },
>(
  props: TProps,
): TProps => ({
  ...props,
  tableThemeDefinitions:
    props.tableThemeDefinitions === undefined
      ? PreviewTableThemeDefinitions
      : [...PreviewTableThemeDefinitions, ...props.tableThemeDefinitions],
});

/** docs preview 的 DetailTable 边界 */
export const PreviewDetailTable: InputEmbeddableTableComponent<DetailTableProps> = Object.assign(
  ((props: DetailTableProps) => <RuntimeDetailTable {...props} />) as FC<DetailTableProps>,
  {
    displayName: 'PreviewDetailTable',
    isTier2Embeddable: true as const,
    inputEmbedAdapter: RuntimeDetailTable.inputEmbedAdapter,
    createInputEmbedProps: (props: Readonly<Record<string, unknown>>) =>
      RuntimeDetailTable.createInputEmbedProps(withTableThemeDefinitions(props as DetailTableProps)),
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
      RuntimeManualTable.createInputEmbedProps(withTableThemeDefinitions(props as ManualTableProps)),
  },
);

const withBranchThemeDefinitions = (props: BranchDiagramProps): BranchDiagramProps => ({
  ...props,
  diagramThemeDefinitions: [...PreviewThemeDefinitionBundle.diagram, ...(props.diagramThemeDefinitions ?? [])],
  graphThemeDefinitions: [...new Set([...PreviewThemeDefinitionBundle.graph, ...(props.graphThemeDefinitions ?? [])])],
});

/** 共享 Diagram 与 Graph 主题的 Branch 文档预览 */
export const PreviewBranchDiagram: typeof RuntimeBranchDiagram = Object.assign(
  ((props: BranchDiagramProps) => (
    <RuntimeBranchDiagram {...withBranchThemeDefinitions(props)} />
  )) as FC<BranchDiagramProps>,
  {
    displayName: 'PreviewBranchDiagram',
    isTier2Embeddable: true as const,
    inputEmbedAdapter: RuntimeBranchDiagram.inputEmbedAdapter,
    createInputEmbedProps: (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) =>
      RuntimeBranchDiagram.createInputEmbedProps(withBranchThemeDefinitions(props as BranchDiagramProps), context),
  },
);
