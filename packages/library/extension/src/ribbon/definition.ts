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

/**
 * 使用内置 bulge 宽度函数与 butt、square、round、arc 端帽的 Ribbon Path kind
 * @description 需要在当前图的 pathKinds 中显式装配，不自动注册
 */
export const RibbonPathKindDefinition = createDefinition([], []);

/**
 * 创建包含内置与自定义宽度函数、端帽的 Ribbon Path kind
 * @param options 扩展注册项，默认 {}；profiles 与 caps 默认 []，仍保留全部内置定义
 * @returns 名称为 ribbon 的 Path kind，供当前图的 pathKinds 显式装配
 * @throws RetikzExtensionError：注册名为空或全空白、不同宽度函数定义同名，或端帽注册名重复时
 */
export const createRibbonPathKindDefinition = (
  options: Readonly<{
    /**
     * 追加的宽度函数定义；不能以不同定义覆盖内置或已注册名称
     * @default []
     */
    profiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
    /**
     * 追加的端帽定义；名称不能与内置或其它端帽重复
     * @default []
     */
    caps?: ReadonlyArray<RibbonCapDefinition>;
  }> = {},
): PathKindDefinition<IRRibbonPath> => createDefinition(options.profiles ?? [], options.caps ?? []);
