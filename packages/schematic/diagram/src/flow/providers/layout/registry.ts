import type { RelationDirectionValue } from '@retikz/graph';

import { assertNonEmptyString, assertPlainDataContainers } from '@retikz/foundation';

import type { FlowLayoutCatalogEntry, FlowLayoutDefinition } from '../../contract';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import { FlowDirection, FlowRoutingKind } from '../../shared';
import { BUILTIN_FLOW_LAYOUT_DEFINITIONS } from './definitions';
import { LayeredFlowLayoutDefinition } from './layered';

/** Flow Layout registry 的运行时注入与默认选择 */
export type FlowLayoutRegistryOptions = Readonly<{
  flowLayouts?: ReadonlyArray<FlowLayoutDefinition>;
  defaultFlowLayout?: string;
}>;

/** 已验证的 Flow Layout registry 与当前默认项 */
export type ResolvedFlowLayoutRegistry = Readonly<{
  layouts: ReadonlyMap<string, FlowLayoutDefinition>;
  defaultLayout: FlowLayoutDefinition;
}>;

const RELATION_DIRECTIONS = new Set<RelationDirectionValue>(['none', 'forward', 'reverse', 'both']);
const ROUTING_KINDS = new Set(Object.values(FlowRoutingKind));
const FLOW_DIRECTIONS = new Set(Object.values(FlowDirection));
const DEFINITION_KEYS = new Set(['name', 'description', 'capabilities', 'defaults', 'layout']);
const CAPABILITY_KEYS = new Set([
  'compoundScopes',
  'groupEndpoints',
  'crossScopeRelations',
  'cycles',
  'selfLoops',
  'parallelRelations',
  'relationLabels',
  'relationDirections',
  'routingKinds',
]);
const DEFAULT_KEYS = new Set(['direction', 'nodeGap', 'rankGap', 'routing']);
const ROUTING_DEFAULT_KEYS = new Set(['kind', 'orthogonalCornerRadius']);

const invalidDefinition = (definition: FlowLayoutDefinition, reason: string, cause?: unknown): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.DefinitionInvalid,
    message: `Flow Layout Definition '${definition.name}' is invalid: ${reason}`,
    details: { capability: 'flow-layout', key: definition.name, reason },
    cause,
  });
};

const validateUniqueValues = <T>(
  values: ReadonlyArray<T>,
  allowed: ReadonlySet<T>,
  label: string,
  definition: FlowLayoutDefinition,
): void => {
  if (values.length === 0) invalidDefinition(definition, `${label} must not be empty.`);
  const unique = new Set(values);
  if (unique.size !== values.length) invalidDefinition(definition, `${label} must not contain duplicates.`);
  if (values.some(value => !allowed.has(value)))
    invalidDefinition(definition, `${label} contains an unsupported value.`);
};

const validateFiniteNonNegative = (value: number, label: string, definition: FlowLayoutDefinition): void => {
  if (!Number.isFinite(value) || value < 0) invalidDefinition(definition, `${label} must be finite and non-negative.`);
};

const validateExactKeys = (
  value: object,
  expectedKeys: ReadonlySet<string>,
  label: string,
  definition: FlowLayoutDefinition,
  requiredKeys: ReadonlySet<string> = expectedKeys,
): void => {
  const keys = Object.keys(value);
  if (keys.some(key => !expectedKeys.has(key)) || [...requiredKeys].some(key => !keys.includes(key))) {
    invalidDefinition(definition, `${label} must use the closed public contract.`);
  }
};

/** 校验一个 Flow Layout Definition 的完整运行时保证 */
export const validateFlowLayoutDefinition = (definition: FlowLayoutDefinition): FlowLayoutDefinition => {
  validateExactKeys(definition, DEFINITION_KEYS, 'definition', definition);
  try {
    assertNonEmptyString(definition.name, 'Flow Layout Definition');
    assertNonEmptyString(definition.description, 'Flow Layout Definition description');
  } catch (cause) {
    return invalidDefinition(definition, 'name and description must be non-empty strings.', cause);
  }
  const capabilities = definition.capabilities;
  const defaults = definition.defaults;
  try {
    assertPlainDataContainers(capabilities, 'Flow Layout Definition capabilities');
    assertPlainDataContainers(defaults, 'Flow Layout Definition defaults');
  } catch (cause) {
    return invalidDefinition(definition, 'capabilities and defaults must use JSON-safe plain data containers.', cause);
  }
  validateExactKeys(capabilities, CAPABILITY_KEYS, 'capabilities', definition);
  validateExactKeys(defaults, DEFAULT_KEYS, 'defaults', definition);
  validateExactKeys(defaults.routing, ROUTING_DEFAULT_KEYS, 'defaults.routing', definition, new Set(['kind']));
  if (capabilities.groupEndpoints && !capabilities.compoundScopes) {
    invalidDefinition(definition, 'groupEndpoints requires compoundScopes.');
  }
  if (capabilities.crossScopeRelations && !capabilities.compoundScopes) {
    invalidDefinition(definition, 'crossScopeRelations requires compoundScopes.');
  }
  validateUniqueValues(capabilities.relationDirections, RELATION_DIRECTIONS, 'relationDirections', definition);
  validateUniqueValues(capabilities.routingKinds, ROUTING_KINDS, 'routingKinds', definition);
  if (!FLOW_DIRECTIONS.has(defaults.direction)) invalidDefinition(definition, 'defaults.direction is unsupported.');
  validateFiniteNonNegative(defaults.nodeGap, 'defaults.nodeGap', definition);
  validateFiniteNonNegative(defaults.rankGap, 'defaults.rankGap', definition);
  if (!capabilities.routingKinds.includes(defaults.routing.kind)) {
    invalidDefinition(definition, 'defaults.routing.kind is not declared by routingKinds.');
  }
  const supportsOrthogonal = capabilities.routingKinds.includes(FlowRoutingKind.Orthogonal);
  const radius = defaults.routing.orthogonalCornerRadius;
  if (supportsOrthogonal !== (radius !== undefined)) {
    invalidDefinition(definition, 'orthogonalCornerRadius must exist exactly when orthogonal routing is supported.');
  }
  if (radius !== undefined) validateFiniteNonNegative(radius, 'defaults.routing.orthogonalCornerRadius', definition);
  if (typeof definition.layout !== 'function') invalidDefinition(definition, 'layout must be a synchronous function.');
  return definition;
};

/** 组装内置优先且 identity-aware 的 Flow Layout registry */
export const resolveFlowLayoutRegistry = (options: FlowLayoutRegistryOptions = {}): ResolvedFlowLayoutRegistry => {
  const layouts = new Map<string, FlowLayoutDefinition>();
  for (const definition of [...BUILTIN_FLOW_LAYOUT_DEFINITIONS, ...(options.flowLayouts ?? [])]) {
    validateFlowLayoutDefinition(definition);
    const existing = layouts.get(definition.name);
    if (existing === definition) continue;
    if (existing !== undefined) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.DefinitionDuplicate,
        message: `Flow Layout Definition '${definition.name}' is already registered.`,
        details: { capability: 'flow-layout', key: definition.name, availableKeys: [...layouts.keys()] },
      });
    }
    layouts.set(definition.name, definition);
  }
  const defaultName = options.defaultFlowLayout ?? LayeredFlowLayoutDefinition.name;
  const defaultLayout = layouts.get(defaultName);
  if (defaultLayout === undefined) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionNotRegistered,
      message: `Default Flow Layout '${defaultName}' is not registered.`,
      details: { capability: 'flow-layout', key: defaultName, availableKeys: [...layouts.keys()] },
    });
  }
  return { layouts, defaultLayout };
};

/** 从同一次真实 registry 投影稳定的 JSON-safe catalog */
export const getFlowLayoutCatalog = (
  options: FlowLayoutRegistryOptions = {},
): ReadonlyArray<FlowLayoutCatalogEntry> => {
  const resolved = resolveFlowLayoutRegistry(options);
  return [...resolved.layouts.values()].map(definition => ({
    name: definition.name,
    description: definition.description,
    capabilities: definition.capabilities,
    defaults: definition.defaults,
    isDefault: definition === resolved.defaultLayout,
  }));
};
