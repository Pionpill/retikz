import type { FlowLayoutDefinition } from '../../../contract';

import { defineFlowLayout } from '../../../contract';
import { layoutLayeredFlow } from './layout';

/** 内置 layered Flow Layout Definition */
export const LayeredFlowLayoutDefinition: FlowLayoutDefinition = defineFlowLayout({
  name: 'layered',
  description: 'Deterministic hierarchical layout for compound directed Flow diagrams.',
  capabilities: {
    compoundScopes: true,
    groupEndpoints: true,
    crossScopeRelations: true,
    cycles: true,
    selfLoops: false,
    parallelRelations: true,
    relationLabels: true,
    relationDirections: ['none', 'forward', 'reverse', 'both'],
    routingKinds: ['straight', 'orthogonal'],
  },
  defaults: {
    direction: 'right',
    nodeGap: 24,
    rankGap: 48,
    routing: { kind: 'straight', orthogonalCornerRadius: 8 },
  },
  layout: layoutLayeredFlow,
});
