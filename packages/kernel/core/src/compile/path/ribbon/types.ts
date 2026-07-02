import type { RibbonWidthProfileDefinition } from '../../../contract/ribbon';
import type { IRPathBase, IRPathRibbonOptions, IRPosition } from '../../../schemas';
import type { SegmentSample, Vector2 } from '../../../shared/geometry';
import type { EmitPathWarnHook } from '../types';

export type RibbonLike = Omit<IRPathBase, 'kind' | 'kindOptions' | 'ribbon'> & IRPathRibbonOptions;

export const DEFAULT_RIBBON_SAMPLES = 64;

export type RibbonSegment = {
  sampleAt: (t: number) => SegmentSample;
  length: number;
};

export type RibbonSegmentInput =
  | { kind: 'line'; from: IRPosition; to: IRPosition }
  | { kind: 'quad'; from: IRPosition; control: IRPosition; to: IRPosition }
  | {
      kind: 'cubic';
      from: IRPosition;
      control1: IRPosition;
      control2: IRPosition;
      to: IRPosition;
    }
  | {
      kind: 'arc';
      center: IRPosition;
      radius: number;
      startAngle: number;
      endAngle: number;
      to: IRPosition;
    }
  | {
      kind: 'ellipseArc';
      center: IRPosition;
      radiusX: number;
      radiusY: number;
      startAngle: number;
      endAngle: number;
      to: IRPosition;
    };

export type RibbonAnalyticSegment =
  | { kind: 'line'; from: IRPosition; to: IRPosition }
  | { kind: 'quad'; from: IRPosition; control: IRPosition; to: IRPosition }
  | {
      kind: 'cubic';
      from: IRPosition;
      control1: IRPosition;
      control2: IRPosition;
      to: IRPosition;
    };

export type RibbonCrossSection = {
  center: IRPosition;
  left: IRPosition;
  right: IRPosition;
  tangent: Vector2;
  width: number;
};

export type RibbonEmitOptions = EmitPathWarnHook & {
  /**
   * ribbon 宽度 profile 注册表。
   * @default 空 Map
   */
  ribbonWidthProfiles?: ReadonlyMap<string, RibbonWidthProfileDefinition>;
};