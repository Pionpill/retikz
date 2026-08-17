import { RetikzCompositeContractError } from '../../resolve/diagnostics';
import {
  assertProviderOutputKeys,
  providerOutputRecord,
  withProviderOutputValidationBoundary,
} from '../scene-primitive';

/** 字体规格：传给 TextMeasurer 的最小信息 */
export type TextFont = {
  /**
   * 字体族
   * @default 'sans-serif'
   */
  family?: string;
  /** 字号（user units） */
  size: number;
  /**
   * 字重
   * @default 'normal'
   */
  weight?: string | number;
  /**
   * 字形：normal / italic / oblique
   * @default 'normal'
   */
  style?: 'normal' | 'italic' | 'oblique';
};

/** 文字度量结果：宽高 + 可选的基线 ascent/descent */
export type TextMetrics = {
  /** 文本宽度（user units） */
  width: number;
  /** 文本高度（user units） */
  height: number;
  /**
   * 基线以上的高度
   * @default 由调用方按字体估算
   */
  ascent?: number;
  /**
   * 基线以下的深度
   * @default 由调用方按字体估算
   */
  descent?: number;
};

/** 已规范化的文字度量结果 */
export type NormalizedTextMetrics = {
  /** 文本宽度 */
  width: number;
  /** 文本视觉盒高度 */
  height: number;
  /** 规范化后的基线上伸 */
  ascent: number;
  /** 规范化后的基线下伸 */
  descent: number;
};

/** 校验并规范化单次文字度量结果 */
export const normalizeTextMetrics = (metrics: TextMetrics): NormalizedTextMetrics =>
  withProviderOutputValidationBoundary('normalizeTextMetrics', () => {
    const candidate = providerOutputRecord('normalizeTextMetrics', metrics, 'text metrics');
    assertProviderOutputKeys(
      'normalizeTextMetrics',
      candidate,
      ['width', 'height', 'ascent', 'descent'],
      'text metrics',
    );
    const width = candidate.width;
    const height = candidate.height;
    const rawAscent = candidate.ascent;
    const rawDescent = candidate.descent;
    const assertMetric = (name: keyof TextMetrics, value: unknown): number => {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new RetikzCompositeContractError(
          `normalizeTextMetrics: invalid ${name} '${String(value)}'; must be a non-negative finite number`,
        );
      }
      return value;
    };

    const normalizedWidth = assertMetric('width', width);
    const normalizedHeight = assertMetric('height', height);
    const measuredAscent = rawAscent === undefined ? undefined : assertMetric('ascent', rawAscent);
    const measuredDescent = rawDescent === undefined ? undefined : assertMetric('descent', rawDescent);

    let ascent: number;
    let descent: number;
    if (measuredAscent !== undefined && measuredDescent !== undefined) {
      const measuredVerticalSpan = measuredAscent + measuredDescent;
      if (!Number.isFinite(measuredVerticalSpan)) {
        throw new RetikzCompositeContractError(
          `normalizeTextMetrics: invalid ascent/descent sum '${measuredVerticalSpan}'; must be a non-negative finite number`,
        );
      }
      const visualHeight = Math.max(normalizedHeight, measuredVerticalSpan);
      const leadingHalf = (visualHeight - measuredVerticalSpan) / 2;
      ascent = measuredAscent + leadingHalf;
      descent = measuredDescent + leadingHalf;
    } else if (measuredAscent !== undefined) {
      const visualHeight = Math.max(normalizedHeight, measuredAscent);
      ascent = measuredAscent;
      descent = visualHeight - measuredAscent;
    } else if (measuredDescent !== undefined) {
      const visualHeight = Math.max(normalizedHeight, measuredDescent);
      ascent = visualHeight - measuredDescent;
      descent = measuredDescent;
    } else {
      ascent = normalizedHeight / 2;
      descent = normalizedHeight / 2;
    }

    return {
      width: normalizedWidth,
      height: ascent + descent,
      ascent,
      descent,
    };
  });

/** 文字度量函数接口 */
export type TextMeasurer = (text: string, font: TextFont) => TextMetrics;

/**
 * 兜底文字度量
 * @description 基于平均字宽估算；非法字号会 throw
 */
export const fallbackMeasurer: TextMeasurer = (text, font) => {
  if (!Number.isFinite(font.size) || font.size < 0) {
    throw new Error(`fallbackMeasurer: invalid font.size '${font.size}'; must be a non-negative finite number`);
  }
  return {
    width: text.length * font.size * 0.55,
    height: font.size * 1.2,
  };
};
