import type { GraphDefinitionOptions } from '@retikz/graph';
import { mergeGraphDefinitionOptions } from '@retikz/graph';

import type { DiagramThemeDefinition } from '../../_diagram';
import { resolveDiagramThemeRegistry } from '../../_diagram';
import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../errors';
import type { FlowDiagramDefinitionOptions, FlowThemeDefinition } from '../contract';
import type { ResolvedFlowLayoutRegistry } from './layout';
import { resolveFlowLayoutRegistry } from './layout';
import { resolveFlowThemeRegistry } from './theme';

type NamedDefinition = Readonly<{ name: string }>;

const mergeNamedDefinitions = <TDefinition extends NamedDefinition>(
  optionSets: ReadonlyArray<FlowDiagramDefinitionOptions>,
  selectDefinitions: (options: FlowDiagramDefinitionOptions) => ReadonlyArray<TDefinition> | undefined,
  capability: string,
): ReadonlyArray<TDefinition> => {
  const definitionsByName = new Map<string, TDefinition>();

  for (const options of optionSets) {
    for (const definition of selectDefinitions(options) ?? []) {
      const existingDefinition = definitionsByName.get(definition.name);
      if (existingDefinition === undefined) {
        definitionsByName.set(definition.name, definition);
        continue;
      }

      if (!Object.is(existingDefinition, definition)) {
        throw new RetikzDiagramError({
          code: RetikzDiagramErrorCode.DefinitionDuplicate,
          message: `${capability} '${definition.name}' received different definition objects in one provider assembly.`,
          details: { capability, key: definition.name },
        });
      }
    }
  }

  return [...definitionsByName.values()];
};

const mergeDefaultFlowLayout = (optionSets: ReadonlyArray<FlowDiagramDefinitionOptions>): string | undefined => {
  const names = [...new Set(optionSets.flatMap(options => options.defaultFlowLayout ?? []))];
  if (names.length <= 1) return names[0];

  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.DefinitionInvalid,
    message: 'Flow Diagram provider assembly received conflicting default Flow Layout names.',
    details: { capability: 'flow-layout', availableKeys: names },
  });
};

const graphOptionsOf = (options: FlowDiagramDefinitionOptions): GraphDefinitionOptions => ({
  entityRoles: options.entityRoles,
  entityKinds: options.entityKinds,
  entityPredicates: options.entityPredicates,
  relationRoles: options.relationRoles,
  relationKinds: options.relationKinds,
  relationPredicates: options.relationPredicates,
  graphThemeDefinitions: options.graphThemeDefinitions,
});

/** Flow Diagram compile 共享的已解析 registries 与默认 Definition */
export type ResolvedFlowDiagramDefinitionOptions = Readonly<{
  /** 有效的 Diagram 外框与呈现主题定义 */
  diagramThemeDefinitions: ReadonlyMap<string, DiagramThemeDefinition>;
  /** 有效的 Flow 元素与关系主题定义 */
  flowThemeDefinitions: ReadonlyMap<string, FlowThemeDefinition>;
  /** 可用布局定义及其默认选择 */
  flowLayouts: ResolvedFlowLayoutRegistry;
  /** 交给 Graph 投影与编译的扩展定义 */
  graph: GraphDefinitionOptions;
}>;

/** 合并并解析一次 Flow Diagram provider assembly 的运行时选项 */
export const resolveFlowDiagramDefinitionOptions = (
  optionSets: ReadonlyArray<FlowDiagramDefinitionOptions>,
): ResolvedFlowDiagramDefinitionOptions => {
  const diagramThemeDefinitions = mergeNamedDefinitions(
    optionSets,
    options => options.diagramThemeDefinitions,
    'diagram-theme',
  );
  const flowThemeDefinitions = mergeNamedDefinitions(optionSets, options => options.flowThemeDefinitions, 'flow-theme');
  const flowLayouts = mergeNamedDefinitions(optionSets, options => options.flowLayouts, 'flow-layout');
  const defaultFlowLayout = mergeDefaultFlowLayout(optionSets);

  return {
    diagramThemeDefinitions: resolveDiagramThemeRegistry(diagramThemeDefinitions),
    flowThemeDefinitions: resolveFlowThemeRegistry(flowThemeDefinitions),
    flowLayouts: resolveFlowLayoutRegistry({ flowLayouts, defaultFlowLayout }),
    graph: mergeGraphDefinitionOptions(optionSets.map(graphOptionsOf)),
  };
};
