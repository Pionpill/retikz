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

/** 用同一 maker 装配端帽和宽度 profile 的 provider contribution */
export const createRibbonProviderContribution = (
  options: Readonly<{
    profiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
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
