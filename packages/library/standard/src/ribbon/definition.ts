import type { PathKindDefinition } from '@retikz/core';

import { definePathKind } from '@retikz/core';

import type { RibbonWidthProfileDefinition } from './profile-types';
import type { IRRibbonPath } from './types';

import { emitRibbonPrimitive } from './geometry';
import { RibbonPathSchema } from './path-schema';

const createDefinition = (profiles: ReadonlyArray<RibbonWidthProfileDefinition>): PathKindDefinition<IRRibbonPath> =>
  definePathKind<IRRibbonPath>({
    name: 'ribbon',
    schema: RibbonPathSchema,
    compile: context =>
      emitRibbonPrimitive(
        context.path,
        {
          appearance: context.appearance,
          round: context.round,
          materializePath: context.materializePath,
          emitHostLabels: context.emitHostLabels,
        },
        profiles,
      ),
  });

/** 官方 Ribbon Path Kind definition，默认只注册 bulge profile */
export const RibbonPathKindDefinition = createDefinition([]);

/** 创建带调用方 profiles 的唯一 Ribbon Path Kind definition */
export const createRibbonPathKindDefinition = (
  options: Readonly<{ profiles?: ReadonlyArray<RibbonWidthProfileDefinition> }> = {},
): PathKindDefinition<IRRibbonPath> => createDefinition(options.profiles ?? []);
