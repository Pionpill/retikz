import { RetikzExtensionError, RetikzExtensionErrorCode } from '../../errors';
import type { RibbonWidthResolution } from '../resolve';
import type { CanonicalRibbonSampling } from '../types';

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/** 校验宽度函数输出：ribbon 宽度必须是有限且非负的数 */
export const assertFiniteWidth = (width: number, source: string): number => {
  if (!Number.isFinite(width) || width < 0) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.GeometryInvalid,
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
 * @description fixed 取常量；taper 插值首尾宽度；stops 消费已排序节点；profile 消费已解析的 Definition 与参数
 */
export const widthFunction = (resolution: RibbonWidthResolution, totalLength: number): ((offset: number) => number) => {
  const { width } = resolution;
  if (width.kind === 'fixed') return () => width.value;
  if (width.kind === 'taper')
    return offset => interpolate({ from: width.start, to: width.end, t: offset, mode: width.interpolation });

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
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.ResolutionInvalid,
      message: `Ribbon width profile '${width.name}' has no resolving-phase provider binding.`,
      details: { profile: width.name },
    });
  }

  return offset => {
    let rawWidth: number;

    try {
      rawWidth = profile.widthAt({ offset, length: totalLength, params });
    } catch (cause) {
      if (cause instanceof RetikzExtensionError) throw cause;

      throw new RetikzExtensionError({
        code: RetikzExtensionErrorCode.ResolutionInvalid,
        message: `Ribbon width profile '${width.name}' widthAt failed at offset ${String(offset)}.`,
        details: { length: totalLength, offset, profile: width.name },
        cause,
      });
    }

    return assertFiniteWidth(rawWidth, `profile "${width.name}" at offset ${offset}`);
  };
};

/**
 * 解析 ribbon 采样数
 * @description sampling 是唯一采样入口。adaptive 按总长 / tolerance 估算并受 maxSamples 限制
 */
export const resolveSampleCount = (sampling: CanonicalRibbonSampling, totalLength: number): number => {
  if (sampling.kind === 'fixed') return sampling.samples;
  return Math.max(2, Math.min(sampling.maxSamples, Math.ceil(totalLength / sampling.tolerance) + 1));
};
