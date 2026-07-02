import type { RibbonWidthProfileDefinition } from '../../../contract/ribbon';
import type { IRPathRibbonOptions, IRRibbonSampling, IRRibbonWidth } from '../../../schemas';
import type { RibbonLike } from './types';

import { providerDefinitionOf } from '../../../providers/registry';
import { JsonObjectSchema } from '../../../schemas';
import { DEFAULT_RIBBON_SAMPLES } from './types';

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

export const assertFiniteWidth = (width: number, source: string): number => {
  if (!Number.isFinite(width) || width < 0) {
    throw new Error(`Ribbon width ${source} produced ${String(width)}; width must be a finite nonnegative number.`);
  }
  return width;
};

export const interpolate = (a: number, b: number, t: number, mode: 'linear' | 'smooth' | 'step'): number => {
  if (mode === 'step') return a;
  const u = mode === 'smooth' ? smoothstep(t) : t;
  return a + (b - a) * u;
};

export const widthFunction = (
  width: IRRibbonWidth,
  profiles: ReadonlyMap<string, RibbonWidthProfileDefinition>,
  totalLength: number,
): ((offset: number) => number) => {
  if (typeof width === 'number') {
    return () => assertFiniteWidth(width, 'number');
  }

  if (width.kind === 'stops') {
    const stops = [...width.stops].sort((a, b) => a.offset - b.offset);
    const mode = width.interpolation ?? 'linear';
    return offset => {
      if (offset <= stops[0].offset) return assertFiniteWidth(stops[0].value, 'first stop');
      for (let i = 1; i < stops.length; i += 1) {
        const prev = stops[i - 1];
        const next = stops[i];
        if (offset <= next.offset) {
          const span = next.offset - prev.offset;
          const localT = span === 0 ? 1 : (offset - prev.offset) / span;
          return assertFiniteWidth(
            interpolate(prev.value, next.value, localT, mode),
            `stops profile at offset ${offset}`,
          );
        }
      }
      return assertFiniteWidth(stops[stops.length - 1].value, 'last stop');
    };
  }

  const profile = providerDefinitionOf(profiles, width.name, {
    capability: 'ribbon width profile',
    optionName: 'ribbonWidthProfiles',
  });
  const rawParams = width.params ?? {};
  const params = profile.paramsSchema ? profile.paramsSchema.parse(rawParams) : JsonObjectSchema.parse(rawParams);
  JsonObjectSchema.parse(params);
  return offset =>
    assertFiniteWidth(
      profile.widthAt({ offset, length: totalLength, params }),
      `profile "${width.name}" at offset ${offset}`,
    );
};

export const centerlineWidthFunction = (
  ribbon: RibbonLike,
  profiles: ReadonlyMap<string, RibbonWidthProfileDefinition>,
  totalLength: number,
): ((offset: number) => number) => {
  if (ribbon.width !== undefined) {
    return widthFunction(ribbon.width, profiles, totalLength);
  }
  const startWidth = ribbon.start?.width;
  const endWidth = ribbon.end?.width;
  if (startWidth === undefined || endWidth === undefined) {
    throw new Error('Centerline ribbon requires either top-level `width` or both `start.width` and `end.width`.');
  }
  const mode = ribbon.interpolation ?? 'linear';
  return offset =>
    assertFiniteWidth(interpolate(startWidth, endWidth, offset, mode), `endpoint width taper at offset ${offset}`);
};

export const centerlineWidthRequiresSampling = (ribbon: RibbonLike): boolean =>
  ribbon.width !== undefined && typeof ribbon.width !== 'number';

export const resolveSampleCount = (
  samples: IRPathRibbonOptions['samples'],
  sampling: IRRibbonSampling | undefined,
  totalLength: number,
): number | undefined => {
  if (samples !== undefined && sampling !== undefined) {
    throw new Error('Ribbon cannot use both `samples` and `sampling`.');
  }
  if (sampling?.kind === 'fixed') return sampling.samples;
  if (sampling?.kind === 'adaptive') {
    const maxSamples = sampling.maxSamples ?? 512;
    return Math.max(2, Math.min(maxSamples, Math.ceil(totalLength / sampling.tolerance) + 1));
  }
  if (samples === true) return DEFAULT_RIBBON_SAMPLES;
  if (samples === false || samples === undefined) return undefined;
  return samples;
};

export const assertSampleCount = (samples: number): number => {
  if (!Number.isInteger(samples) || samples < 2 || samples > 512) {
    throw new Error(`Ribbon samples must be an integer in [2, 512]; got ${String(samples)}.`);
  }
  return samples;
};
