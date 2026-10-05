import { mergeGraphDefinitionOptions } from '@retikz/graph';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../errors';
import type { BranchDiagramDefinitionOptions, BranchLayoutDefinition } from '../contract';
import { LanesBranchLayoutDefinition } from './lanes';

/** 合并 Branch 布局注册表与运行时定义装配 */
export const resolveBranchDefinitionOptions = (optionSets: ReadonlyArray<BranchDiagramDefinitionOptions>) => {
  const registry = new Map<string, BranchLayoutDefinition>([
    [LanesBranchLayoutDefinition.name, LanesBranchLayoutDefinition],
  ]);
  const names = new Set<string>();

  for (const options of optionSets) {
    if (options.defaultBranchLayout !== undefined) names.add(options.defaultBranchLayout);

    for (const definition of options.branchLayouts ?? []) {
      if (definition.name.trim().length === 0)
        throw new RetikzDiagramError({
          code: RetikzDiagramErrorCode.DefinitionInvalid,
          message: 'Branch layout name must not be empty.',
          details: { capability: 'branch-layout' },
        });

      const previous = registry.get(definition.name);
      if (previous !== undefined && previous !== definition)
        throw new RetikzDiagramError({
          code: RetikzDiagramErrorCode.DefinitionDuplicate,
          message: `Duplicate Branch layout '${definition.name}'.`,
          details: { key: definition.name },
        });

      registry.set(definition.name, definition);
    }
  }

  if (names.size > 1)
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionInvalid,
      message: 'Conflicting default Branch layouts.',
      details: { availableKeys: [...names] },
    });

  const name = [...names][0] ?? LanesBranchLayoutDefinition.name;
  const definition = registry.get(name);
  if (definition === undefined)
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionNotRegistered,
      message: `Unknown Branch layout '${name}'.`,
      details: { key: name, availableKeys: [...registry.keys()] },
    });

  const options: BranchDiagramDefinitionOptions = {
    ...mergeGraphDefinitionOptions(optionSets),
    diagramThemeStyles: [...new Set(optionSets.flatMap(value => value.diagramThemeStyles ?? []))],
  };

  return { definition, options };
};
