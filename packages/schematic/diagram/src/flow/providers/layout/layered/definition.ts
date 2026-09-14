import type { FlowLayoutDefinition } from '../../../contract';

import { defineFlowLayout } from '../../../contract';
import { FlowRoutingKind } from '../../../shared';
import { layoutLayeredFlow } from './layout';

/** 内置 layered Flow Layout Definition */
export const LayeredFlowLayoutDefinition: FlowLayoutDefinition = defineFlowLayout({
  name: 'layered',
  description: 'Deterministic hierarchical layout for compound directed Flow diagrams.',
  capabilities: {
    placementKinds: ['linear', 'grid'],
    compoundScopes: true,
    groupEndpoints: true,
    crossScopeRelations: true,
    cycles: true,
    selfLoops: false,
    parallelRelations: true,
    relationLabels: true,
    relationDirections: ['none', 'forward', 'reverse', 'both'],
    routingKinds: Object.values(FlowRoutingKind),
  },
  defaults: {
    direction: 'right',
    nodeGap: 48,
    rankGap: 48,
    placementGap: { horizontal: 48, vertical: 32 },
    routing: { kind: 'straight', orthogonalCornerRadius: 8 },
  },
  layout: layoutLayeredFlow,
});
