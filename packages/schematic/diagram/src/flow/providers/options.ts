import type { GraphDefinitionOptions } from '@retikz/graph';

import { mergeGraphDefinitionOptions } from '@retikz/graph';

import type { DiagramThemeStyleDefinition } from '../../_diagram';
import type { FlowDiagramDefinitionOptions, FlowThemeStyleDefinition } from '../contract';
import type { ResolvedFlowLayoutRegistry } from './layout';

import { resolveDiagramThemeStyleRegistry } from '../../_diagram';
import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../errors';
import { resolveFlowLayoutRegistry } from './layout';
import { resolveFlowThemeStyleRegistry } from './theme';

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
  graphThemeStyles: options.graphThemeStyles,
});

/** Flow Diagram compile 共享的已解析 registries 与默认 Definition */
export type ResolvedFlowDiagramDefinitionOptions = Readonly<{
  diagramThemeStyles: ReadonlyMap<string, DiagramThemeStyleDefinition>;
  flowThemeStyles: ReadonlyMap<string, FlowThemeStyleDefinition>;
  flowLayouts: ResolvedFlowLayoutRegistry;
  graph: GraphDefinitionOptions;
}>;

/** 合并并解析一次 Flow Diagram provider assembly 的运行时选项 */
export const resolveFlowDiagramDefinitionOptions = (
  optionSets: ReadonlyArray<FlowDiagramDefinitionOptions>,
): ResolvedFlowDiagramDefinitionOptions => {
  const diagramThemeStyles = mergeNamedDefinitions(
    optionSets,
    options => options.diagramThemeStyles,
    'diagram-theme-style',
  );
  const flowThemeStyles = mergeNamedDefinitions(optionSets, options => options.flowThemeStyles, 'flow-theme-style');
  const flowLayouts = mergeNamedDefinitions(optionSets, options => options.flowLayouts, 'flow-layout');
  const defaultFlowLayout = mergeDefaultFlowLayout(optionSets);
  return {
    diagramThemeStyles: resolveDiagramThemeStyleRegistry(diagramThemeStyles),
    flowThemeStyles: resolveFlowThemeStyleRegistry(flowThemeStyles),
    flowLayouts: resolveFlowLayoutRegistry({ flowLayouts, defaultFlowLayout }),
    graph: mergeGraphDefinitionOptions(optionSets.map(graphOptionsOf)),
  };
};
