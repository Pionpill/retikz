import type { IRJsonObject } from '@retikz/core';

import { JsonObjectSchema } from '@retikz/core';

import type { RibbonWidthProfileDefinition } from './profile-types';
import type {
  CanonicalRibbonEndpoint,
  CanonicalRibbonOptions,
  CanonicalRibbonSampling,
  CanonicalRibbonWidth,
  IRRibbonPathOptions,
  IRRibbonWidth,
} from './types';

/** Ribbon 宽度在 compile 阶段绑定的 profile 与参数 */
export type RibbonWidthResolution = Readonly<{
  width: CanonicalRibbonWidth;
  definition?: RibbonWidthProfileDefinition;
  params?: IRJsonObject;
  requiresSampling: boolean;
}>;

const canonicalizeWidth = (width: IRRibbonWidth | undefined): CanonicalRibbonWidth | undefined => {
  if (width === undefined || typeof width === 'number' || width.kind === 'profile') return width;
  return {
    ...width,
    interpolation: width.interpolation ?? 'linear',
    stops: [...width.stops].sort((left, right) => left.offset - right.offset),
  };
};

const canonicalizeEndpoint = (endpoint: IRRibbonPathOptions['start']): CanonicalRibbonEndpoint => ({
  ...(endpoint ?? {}),
  cap: endpoint?.cap ?? 'butt',
});

const canonicalizeSampling = (
  sampling: IRRibbonPathOptions['sampling'],
  samples: IRRibbonPathOptions['samples'],
): CanonicalRibbonSampling | undefined => {
  if (sampling?.kind === 'adaptive') return { ...sampling, maxSamples: sampling.maxSamples ?? 512 };
  if (sampling !== undefined) return sampling;
  if (samples === true) return { kind: 'fixed', samples: 64 };
  if (typeof samples === 'number') return { kind: 'fixed', samples };
  return undefined;
};

/** 将紧凑 Ribbon options 展开为唯一 compile 消费形态 */
export const resolveRibbonOptions = (options: IRRibbonPathOptions): CanonicalRibbonOptions => ({
  ...options,
  mode: options.mode ?? 'centerline',
  align: options.align ?? 'center',
  interpolation: options.interpolation ?? 'linear',
  width: canonicalizeWidth(options.width),
  start: canonicalizeEndpoint(options.start),
  end: canonicalizeEndpoint(options.end),
  sampling: canonicalizeSampling(options.sampling, options.samples),
  upper: options.upper === undefined ? undefined : [...options.upper],
  lower: options.lower === undefined ? undefined : [...options.lower],
});

/** 解析 Ribbon 宽度 profile、参数和动态采样要求 */
export const resolveRibbonWidth = (
  width: CanonicalRibbonWidth | undefined,
  profiles: ReadonlyMap<string, RibbonWidthProfileDefinition>,
  irPath: string,
): RibbonWidthResolution | undefined => {
  if (width === undefined) return undefined;
  if (typeof width === 'number') return { width, requiresSampling: false };
  if (width.kind === 'stops') return { width, requiresSampling: true };

  const definition = profiles.get(width.name);
  if (definition === undefined) {
    throw new Error(`Unknown Ribbon width profile '${width.name}' at ${irPath}.`);
  }
  const paramsPath = `${irPath}.params`;
  const rawParams = width.params ?? {};
  let params: IRJsonObject;
  try {
    const parsed = definition.paramsSchema?.parse(rawParams) ?? JsonObjectSchema.parse(rawParams);
    params = JsonObjectSchema.parse(parsed);
  } catch (cause) {
    throw new Error(`Ribbon width profile '${width.name}' params are invalid at ${paramsPath}.`, { cause });
  }
  return { width, definition, params, requiresSampling: true };
};
