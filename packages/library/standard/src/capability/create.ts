import type { AnyCompositeDefinition } from '@retikz/core';

import type { StandardBundle, StandardCapabilityModule } from './types';

/**
 * 组合选定的 Standard capability modules
 * @description 复制名称和 definition 引用并冻结返回容器，不修改或冻结调用方输入
 */
export const createStandardBundle = (modules: ReadonlyArray<StandardCapabilityModule>): StandardBundle => {
  const moduleNames: Array<string> = [];
  const composites: Array<AnyCompositeDefinition> = [];
  const seenNames = new Set<string>();

  for (const module of modules) {
    if (module.name.trim().length === 0) {
      throw new Error('Standard capability module name must be non-empty');
    }
    if (seenNames.has(module.name)) {
      throw new Error(`Duplicate Standard capability module name: ${module.name}`);
    }

    seenNames.add(module.name);
    moduleNames.push(module.name);
    composites.push(...module.composites);
  }

  const frozenModules = Object.freeze(moduleNames);
  const frozenComposites = Object.freeze(composites);
  const compile = Object.freeze({ composites: frozenComposites });

  return Object.freeze({ modules: frozenModules, compile });
};
