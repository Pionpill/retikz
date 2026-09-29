import type { PathKindDefinition } from '@retikz/core';
import { definePathKind } from '@retikz/core';

import { BUILTIN_RIBBON_WIDTH_PROFILES } from './bulge';
import { ExtensionRibbonCapDefinitions } from './cap';
import { resolveRibbonCapRegistry } from './cap-registry';
import type { RibbonCapDefinition } from './cap-types';
import { emitRibbonPrimitive } from './geometry';
import { RibbonPathSchema } from './path-schema';
import { resolveRibbonWidthProfileRegistry } from './profile-registry';
import type { RibbonWidthProfileDefinition } from './profile-types';
import type { IRRibbonPath } from './types';

const createDefinition = (
  profiles: ReadonlyArray<RibbonWidthProfileDefinition>,
  caps: ReadonlyArray<RibbonCapDefinition>,
): PathKindDefinition<IRRibbonPath> => {
  const capRegistry = resolveRibbonCapRegistry(ExtensionRibbonCapDefinitions, caps);
  const profileRegistry = resolveRibbonWidthProfileRegistry(BUILTIN_RIBBON_WIDTH_PROFILES, profiles);
  return definePathKind<IRRibbonPath>({
    name: 'ribbon',
    schema: RibbonPathSchema,
    compile: context => {
      const output = emitRibbonPrimitive(
        context.path,
        {
          appearance: context.appearance,
          round: context.round,
          materializePath: context.materializePath,
          emitHostLabels: context.emitHostLabels,
          emitBoundaryLabels: context.emitBoundaryLabels,
        },
        profileRegistry,
        capRegistry,
      );
      return output === null ? null : context.wrapOutput(output);
    },
  });
};

/** 官方 Ribbon Path Kind definition，默认只注册 bulge profile */
export const RibbonPathKindDefinition = createDefinition([], []);

/** 创建带调用方 profiles 的唯一 Ribbon Path Kind definition */
export const createRibbonPathKindDefinition = (
  options: Readonly<{
    profiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
    caps?: ReadonlyArray<RibbonCapDefinition>;
  }> = {},
): PathKindDefinition<IRRibbonPath> => createDefinition(options.profiles ?? [], options.caps ?? []);
