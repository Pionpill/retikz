import { arcEndPoint } from '@retikz/math';

import type { PathCommand } from '../../../contract';
import type { IRPosition } from '../../../schemas';

import { DEG_TO_RAD } from '../../../shared/geometry';
import { samePoint } from '../host';

export type EmitCubicCommandInput = {
  control1: IRPosition;
  control2: IRPosition;
  to: IRPosition;
  sourceAutoBoundary?: boolean;
};

export type EmitArcCommandInput = {
  center: IRPosition;
  radius: number;
  startAngle: number;
  endAngle: number;
};

export type EmitEllipseArcCommandInput = {
  center: IRPosition;
  radiusX: number;
  radiusY: number;
  startAngle: number;
  endAngle: number;
};

export type PathCommandEmitter = {
  commands: Array<PathCommand>;
  provenance: Array<string>;
  boundsPoints: Array<IRPosition>;
  endpointSource: {
    firstAutoBoundary: boolean;
    lastAutoBoundary: boolean;
  };
  getLastEnd: () => IRPosition | null;
  getSubPathStart: () => IRPosition | null;
  emitMove: (p: IRPosition, sourceAutoBoundary?: boolean) => void;
  emitLine: (p: IRPosition, sourceAutoBoundary?: boolean) => void;
  emitClose: () => void;
  emitQuad: (control: IRPosition, p: IRPosition, sourceAutoBoundary?: boolean) => void;
  emitCubic: (input: EmitCubicCommandInput) => void;
  emitArc: (input: EmitArcCommandInput) => void;
  emitEllipseArc: (input: EmitEllipseArcCommandInput) => void;
  startSegment: (p: IRPosition, sourceAutoBoundary?: boolean) => void;
};

export type CreatePathCommandEmitterInput = {
  round: (n: number) => number;
  currentStepKind: () => string;
};

/** 创建普通 path emit 的命令写入器 */
export const createPathCommandEmitter = ({
  round,
  currentStepKind,
}: CreatePathCommandEmitterInput): PathCommandEmitter => {
  const commands: Array<PathCommand> = [];
  const provenance: Array<string> = [];
  const boundsPoints: Array<IRPosition> = [];
  let lastEnd: IRPosition | null = null;
  let subPathStart: IRPosition | null = null;

  const endpointSource = {
    firstAutoBoundary: false,
    lastAutoBoundary: false,
  };

  const roundPoint = (p: IRPosition): IRPosition => [round(p[0]), round(p[1])];

  const noteEndpointSource = (sourceAutoBoundary: boolean): void => {
    if (commands.length === 0) endpointSource.firstAutoBoundary = sourceAutoBoundary;
    endpointSource.lastAutoBoundary = sourceAutoBoundary;
  };

  const emitMove = (p: IRPosition, sourceAutoBoundary = false): void => {
    noteEndpointSource(sourceAutoBoundary);
    const rp = roundPoint(p);
    commands.push({ kind: 'move', to: [rp[0], rp[1]] });
    provenance.push(currentStepKind());
    boundsPoints.push(p);
    subPathStart = p;
    lastEnd = p;
  };

  const emitLine = (p: IRPosition, sourceAutoBoundary = false): void => {
    noteEndpointSource(sourceAutoBoundary);
    const rp = roundPoint(p);
    commands.push({ kind: 'line', to: [rp[0], rp[1]] });
    provenance.push(currentStepKind());
    boundsPoints.push(p);
    lastEnd = p;
  };

  const emitClose = (): void => {
    commands.push({ kind: 'close' });
    provenance.push(currentStepKind());
    lastEnd = subPathStart;
  };

  const emitQuad = (control: IRPosition, p: IRPosition, sourceAutoBoundary = false): void => {
    noteEndpointSource(sourceAutoBoundary);
    const rc = roundPoint(control);
    const rp = roundPoint(p);
    commands.push({
      kind: 'quad',
      control: [rc[0], rc[1]],
      to: [rp[0], rp[1]],
    });
    provenance.push(currentStepKind());
    boundsPoints.push(control);
    boundsPoints.push(p);
    lastEnd = p;
  };

  const emitCubic = ({ control1, control2, to, sourceAutoBoundary = false }: EmitCubicCommandInput): void => {
    noteEndpointSource(sourceAutoBoundary);
    const rc1 = roundPoint(control1);
    const rc2 = roundPoint(control2);
    const rp = roundPoint(to);
    commands.push({
      kind: 'cubic',
      control1: [rc1[0], rc1[1]],
      control2: [rc2[0], rc2[1]],
      to: [rp[0], rp[1]],
    });
    provenance.push(currentStepKind());
    boundsPoints.push(control1);
    boundsPoints.push(control2);
    boundsPoints.push(to);
    lastEnd = to;
  };

  const emitArc = ({ center, radius, startAngle, endAngle }: EmitArcCommandInput): void => {
    noteEndpointSource(false);
    const rc = roundPoint(center);
    commands.push({
      kind: 'arc',
      center: [rc[0], rc[1]],
      radius: round(radius),
      startAngle,
      endAngle,
    });
    provenance.push(currentStepKind());
    const endPoint = arcEndPoint(center, radius, endAngle);
    boundsPoints.push(endPoint);
    lastEnd = endPoint;
  };

  const emitEllipseArc = ({ center, radiusX, radiusY, startAngle, endAngle }: EmitEllipseArcCommandInput): void => {
    noteEndpointSource(false);
    const rc = roundPoint(center);
    commands.push({
      kind: 'ellipseArc',
      center: [rc[0], rc[1]],
      radiusX: round(radiusX),
      radiusY: round(radiusY),
      startAngle,
      endAngle,
    });
    provenance.push(currentStepKind());
    const endPt: IRPosition = [
      center[0] + Math.cos(endAngle * DEG_TO_RAD) * radiusX,
      center[1] + Math.sin(endAngle * DEG_TO_RAD) * radiusY,
    ];
    boundsPoints.push(endPt);
    lastEnd = endPt;
  };

  const startSegment = (p: IRPosition, sourceAutoBoundary = false): void => {
    if (samePoint(p, lastEnd)) return;
    emitMove(p, sourceAutoBoundary);
  };

  return {
    commands,
    provenance,
    boundsPoints,
    endpointSource,
    getLastEnd: () => lastEnd,
    getSubPathStart: () => subPathStart,
    emitMove,
    emitLine,
    emitClose,
    emitQuad,
    emitCubic,
    emitArc,
    emitEllipseArc,
    startSegment,
  };
};
