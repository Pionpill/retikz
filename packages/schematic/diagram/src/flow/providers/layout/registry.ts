import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type { FlowLayoutCatalogEntry, FlowLayoutDefinition } from '../../contract';
import { BUILTIN_FLOW_LAYOUT_DEFINITIONS } from './definitions';
import { LayeredFlowLayoutDefinition } from './layered';

/** Flow Layout registry 的运行时注入与默认选择 */
export type FlowLayoutRegistryOptions = Readonly<{
  /**
   * 追加到内置布局目录的自定义定义；名称不能与不同定义重复
   * @default []
   */
  flowLayouts?: ReadonlyArray<FlowLayoutDefinition>;
  /**
   * 当前编译使用的布局名称，必须已注册；省略时使用内置 layered 布局
   * @default LayeredFlowLayoutDefinition.name
   */
  defaultFlowLayout?: string;
}>;

/** 已验证的 Flow Layout registry 与当前默认项 */
export type ResolvedFlowLayoutRegistry = Readonly<{
  /** 按名称索引的可用布局定义 */
  layouts: ReadonlyMap<string, FlowLayoutDefinition>;
  /** 未显式选择布局名称时使用的定义 */
  defaultLayout: FlowLayoutDefinition;
}>;

const invalidDefinition = (definition: FlowLayoutDefinition, reason: string, cause?: unknown): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.DefinitionInvalid,
    message: `Flow Layout Definition '${definition.name}' is invalid: ${reason}`,
    details: { capability: 'flow-layout', key: definition.name, reason },
    cause,
  });
};

/** 校验一个 Flow Layout Definition 的完整运行时保证 */
const validateFlowLayoutDefinition = (definition: FlowLayoutDefinition): FlowLayoutDefinition => {
  const validateUniqueValues = <T>(
    values: ReadonlyArray<T>,
    label: string,
    layoutDefinition: FlowLayoutDefinition,
  ): void => {
    if (values.length === 0) invalidDefinition(layoutDefinition, `${label} must not be empty.`);
    const unique = new Set(values);
    if (unique.size !== values.length) invalidDefinition(layoutDefinition, `${label} must not contain duplicates.`);
  };

  const validateFiniteNonNegative = (value: number, label: string, layoutDefinition: FlowLayoutDefinition): void => {
    if (!Number.isFinite(value) || value < 0)
      invalidDefinition(layoutDefinition, `${label} must be finite and non-negative.`);
  };

  const capabilities = definition.capabilities;
  const defaults = definition.defaults;

  if (capabilities.groupEndpoints && !capabilities.compoundScopes) {
    invalidDefinition(definition, 'groupEndpoints requires compoundScopes.');
  }

  if (capabilities.crossScopeRelations && !capabilities.compoundScopes) {
    invalidDefinition(definition, 'crossScopeRelations requires compoundScopes.');
  }

  validateUniqueValues(capabilities.relationDirections, 'relationDirections', definition);
  validateUniqueValues(
    capabilities.routing.map(item => item.kind),
    'routing',
    definition,
  );

  for (const item of capabilities.routing) {
    if (item.kind === 'curve' || item.kind === 'cubic') {
      validateUniqueValues(item.modes, 'routing modes', definition);
    }
  }

  validateUniqueValues(capabilities.placementKinds, 'placementKinds', definition);
  validateFiniteNonNegative(defaults.nodeGap, 'defaults.nodeGap', definition);
  validateFiniteNonNegative(defaults.rankGap, 'defaults.rankGap', definition);
  validateFiniteNonNegative(defaults.placementGap.horizontal, 'defaults.placementGap.horizontal', definition);
  validateFiniteNonNegative(defaults.placementGap.vertical, 'defaults.placementGap.vertical', definition);
  if (!capabilities.routing.some(item => item.kind === defaults.routing.kind)) {
    invalidDefinition(definition, 'defaults.routing.kind is not declared by routing.');
  }

  const supportsOrthogonal = capabilities.routing.some(
    ({ kind }) => kind === 'orthogonal' || kind === '-|' || kind === '|-',
  );
  const radius = defaults.routing.orthogonalCornerRadius;
  if (supportsOrthogonal !== (radius !== undefined)) {
    invalidDefinition(
      definition,
      'orthogonalCornerRadius must exist exactly when an axis-aligned routing kind is supported.',
    );
  }

  if (radius !== undefined) validateFiniteNonNegative(radius, 'defaults.routing.orthogonalCornerRadius', definition);

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

/**
 * 从同一次真实 registry 投影稳定的 JSON-safe catalog
 * @param options 自定义布局与默认布局选择；省略时列出内置布局并选择 layered
 * @returns 按内置、自定义顺序排列的布局目录，标记当前默认项并省略布局回调
 * @throws RetikzDiagramError 布局定义无效、名称冲突或默认布局未注册时抛出
 */
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
