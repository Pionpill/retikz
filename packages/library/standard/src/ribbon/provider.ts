import type { CoreDependencyProvider, CoreProviderContribution, CoreProviderKey } from '@retikz/core';

import { assertNonEmptyString } from '@retikz/foundation';

import type { RibbonWidthProfileDefinition } from './profile-types';

import { RetikzStandardError, RetikzStandardErrorCode } from '../errors';
import { BUILTIN_RIBBON_WIDTH_PROFILES } from './bulge';
import { createRibbonPathKindDefinition } from './definition';

const ribbonKey: CoreProviderKey = { capability: 'pathKind', name: 'ribbon' };

const profileDatasetsOf = (
  profiles: ReadonlyArray<RibbonWidthProfileDefinition>,
): Readonly<Record<string, RibbonWidthProfileDefinition>> => {
  const datasets = Object.create(null) as Record<string, RibbonWidthProfileDefinition>;
  for (const profile of profiles) {
    assertNonEmptyString(profile.name, 'Ribbon width profile name');
    if (Object.hasOwn(datasets, profile.name) && datasets[profile.name] !== profile) {
      throw new RetikzStandardError({
        code: RetikzStandardErrorCode.RegistryConflict,
        message: `Ribbon width profile '${profile.name}' is defined more than once.`,
        details: { name: profile.name },
      });
    }
    datasets[profile.name] = profile;
  }
  return datasets;
};

const makeRibbonDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createRibbonPathKindDefinition({
    profiles: Object.values(datasets) as ReadonlyArray<RibbonWidthProfileDefinition>,
  });

const ribbonProvider: CoreDependencyProvider = {
  key: ribbonKey,
  dependencies: [],
  datasets: profileDatasetsOf(BUILTIN_RIBBON_WIDTH_PROFILES),
  makeDefinition: makeRibbonDefinition,
};

/** 创建 Standard Ribbon 的 Core provider contribution */
export const createRibbonProviderContribution = (
  profiles: ReadonlyArray<RibbonWidthProfileDefinition> = [],
): CoreProviderContribution => ({
  roots: [ribbonKey],
  providers: [
    {
      ...ribbonProvider,
      datasets: profileDatasetsOf([...BUILTIN_RIBBON_WIDTH_PROFILES, ...profiles]),
    },
  ],
});
