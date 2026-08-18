import type { RibbonWidthResolution } from '../resolve';
import type { CanonicalRibbonSampling } from '../types';
import type { RibbonLike } from './types';

import { RetikzStandardError, RetikzStandardErrorCode } from '../../errors';

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/** 校验宽度函数输出：ribbon 宽度必须是有限且非负的数 */
export const assertFiniteWidth = (width: number, source: string): number => {
  if (!Number.isFinite(width) || width < 0) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.GeometryInvalid,
      message: `Ribbon width ${source} produced ${String(width)}; width must be a finite nonnegative number.`,
      details: { source, width },
    });
  }
  return width;
};

/** 按指定插值模式在两个宽度值之间取样 */
export type InterpolateInput = {
  from: number;
  to: number;
  t: number;
  mode: 'linear' | 'smooth' | 'step';
};

export const interpolate = ({ from, to, t, mode }: InterpolateInput): number => {
  if (mode === 'step') return from;
  const u = mode === 'smooth' ? smoothstep(t) : t;
  return from + (to - from) * u;
};

/**
 * 把 IRRibbonWidth 解析为 offset∈[0,1] → width 的函数
 * @description number 走常量宽度；stops 先按 offset 排序再插值；profile 查运行时注册表并校验 params JSON-safe
 */
export const widthFunction = (resolution: RibbonWidthResolution, totalLength: number): ((offset: number) => number) => {
  const { width } = resolution;
  if (typeof width === 'number') {
    return () => assertFiniteWidth(width, 'number');
  }

  if (width.kind === 'stops') {
    const stops = width.stops;
    const mode = width.interpolation;
    return offset => {
      if (offset <= stops[0].offset) return assertFiniteWidth(stops[0].value, 'first stop');
      for (let i = 1; i < stops.length; i += 1) {
        const prev = stops[i - 1];
        const next = stops[i];
        if (offset <= next.offset) {
          const span = next.offset - prev.offset;
          const localT = span === 0 ? 1 : (offset - prev.offset) / span;
          return assertFiniteWidth(
            interpolate({ from: prev.value, to: next.value, t: localT, mode }),
            `stops profile at offset ${offset}`,
          );
        }
      }
      return assertFiniteWidth(stops[stops.length - 1].value, 'last stop');
    };
  }

  const profile = resolution.definition;
  const params = resolution.params;
  if (profile === undefined || params === undefined) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.ResolutionInvalid,
      message: `Ribbon width profile '${width.name}' has no resolving-phase provider binding.`,
      details: { profile: width.name },
    });
  }
  return offset => {
    let rawWidth: number;
    try {
      rawWidth = profile.widthAt({ offset, length: totalLength, params });
    } catch (cause) {
      if (cause instanceof RetikzStandardError) throw cause;
      throw new RetikzStandardError({
        code: RetikzStandardErrorCode.ResolutionInvalid,
        message: `Ribbon width profile '${width.name}' widthAt failed at offset ${String(offset)}.`,
        details: { length: totalLength, offset, profile: width.name },
        cause,
      });
    }
    return assertFiniteWidth(rawWidth, `profile "${width.name}" at offset ${offset}`);
  };
};

/**
 * 解析 centerline ribbon 的宽度函数
 * @description 顶层 width 优先；未给 width 时用 start.width/end.width 做端点 taper
 */
export const centerlineWidthFunction = (
  ribbon: RibbonLike,
  widthResolution: RibbonWidthResolution | undefined,
  totalLength: number,
): ((offset: number) => number) => {
  if (ribbon.width !== undefined) {
    if (widthResolution === undefined) {
      throw new RetikzStandardError({
        code: RetikzStandardErrorCode.ResolutionInvalid,
        message: 'Ribbon width has no resolving-phase provider binding.',
        details: { width: ribbon.width },
      });
    }
    return widthFunction(widthResolution, totalLength);
  }
  const startWidth = ribbon.start.width;
  const endWidth = ribbon.end.width;
  if (startWidth === undefined || endWidth === undefined) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'Centerline ribbon requires either top-level `width` or both `start.width` and `end.width`.',
      details: { hasEndWidth: endWidth !== undefined, hasStartWidth: startWidth !== undefined },
    });
  }
  const mode = ribbon.interpolation;
  return offset =>
    assertFiniteWidth(
      interpolate({ from: startWidth, to: endWidth, t: offset, mode }),
      `endpoint width taper at offset ${offset}`,
    );
};

/** 动态 width（stops/profile）会让解析型 offset 不再可靠，需要走采样轮廓 */
export const centerlineWidthRequiresSampling = (widthResolution: RibbonWidthResolution | undefined): boolean =>
  widthResolution?.requiresSampling ?? false;

/**
 * 解析 ribbon 采样数
 * @description samples 是旧快捷入口；sampling 是新对象入口，二者互斥。adaptive 按总长 / tolerance 估算并受 maxSamples 限制
 */
export const resolveSampleCount = (
  sampling: CanonicalRibbonSampling | undefined,
  totalLength: number,
): number | undefined => {
  if (sampling?.kind === 'fixed') return sampling.samples;
  if (sampling?.kind === 'adaptive') {
    return Math.max(2, Math.min(sampling.maxSamples, Math.ceil(totalLength / sampling.tolerance) + 1));
  }
  return undefined;
};

/** 校验采样点数量，避免过少无法形成轮廓或过多造成异常开销 */
export const assertSampleCount = (samples: number): number => {
  if (!Number.isInteger(samples) || samples < 2 || samples > 512) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: `Ribbon samples must be an integer in [2, 512]; got ${String(samples)}.`,
      details: { samples },
    });
  }
  return samples;
};
