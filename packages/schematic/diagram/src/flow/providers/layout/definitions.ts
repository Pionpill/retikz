import type { FlowLayoutDefinition } from '../../contract';

import { LayeredFlowLayoutDefinition } from './layered';

/** Diagram 包内置的稳定 Flow Layout Definition 集合 */
export const BUILTIN_FLOW_LAYOUT_DEFINITIONS: ReadonlyArray<FlowLayoutDefinition> = Object.freeze([
  LayeredFlowLayoutDefinition,
]);
