import type { CoreDependencyProvider, CoreProviderContribution, CoreProviderKey } from '@retikz/core';

import { BUILTIN_RIBBON_WIDTH_PROFILES } from './bulge';
import { ExtensionRibbonCapDefinitions } from './cap';
import { resolveRibbonCapRegistry } from './cap-registry';
import type { RibbonCapDefinition } from './cap-types';
import { createRibbonPathKindDefinition } from './definition';
import { resolveRibbonWidthProfileRegistry } from './profile-registry';
import type { RibbonWidthProfileDefinition } from './profile-types';

const ribbonKey: CoreProviderKey = { capability: 'pathKind', name: 'ribbon' };

const makeRibbonDefinition: CoreDependencyProvider['makeDefinition'] = datasets => {
  const profiles: Array<RibbonWidthProfileDefinition> = [];
  const caps: Array<RibbonCapDefinition> = [];

  for (const [key, value] of Object.entries(datasets)) {
    if (key.startsWith('profile:')) profiles.push(value as RibbonWidthProfileDefinition);
    else caps.push(value as RibbonCapDefinition);
  }

  return createRibbonPathKindDefinition({ profiles, caps });
};

/**
 * 创建供 Core 依赖解析器装配 Ribbon Path kind 的贡献项
 * @description 包含 ribbon 根依赖与内置定义，调用方可追加宽度函数和端帽；不自动注入编译器
 * @param options 扩展注册项，默认 {}；profiles 与 caps 默认 []，仍保留全部内置定义
 * @returns 包含 ribbon 根依赖及对应 provider 的贡献项，交给 resolveCoreProviderDependencies 装配
 * @throws RetikzExtensionError：注册名为空或全空白、不同宽度函数定义同名，或端帽注册名重复时
 */
export const createRibbonProviderContribution = (
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
): CoreProviderContribution => {
  const profiles = options.profiles ?? [];
  const caps = options.caps ?? [];
  resolveRibbonWidthProfileRegistry(BUILTIN_RIBBON_WIDTH_PROFILES, profiles);
  resolveRibbonCapRegistry(ExtensionRibbonCapDefinitions, caps);
  const datasets: Record<string, RibbonWidthProfileDefinition | RibbonCapDefinition> = Object.create(null);

  for (const profile of [...BUILTIN_RIBBON_WIDTH_PROFILES, ...profiles]) datasets[`profile:${profile.name}`] = profile;

  for (const cap of caps) datasets[`cap:${cap.name}`] = cap;

  return {
    roots: [ribbonKey],
    providers: [{ key: ribbonKey, dependencies: [], datasets, makeDefinition: makeRibbonDefinition }],
  };
};
