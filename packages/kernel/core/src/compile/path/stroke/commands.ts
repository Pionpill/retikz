import { pointAtArcAngle } from '@retikz/math';

import type { PathCommand } from '../../../contract';
import type { IRPosition } from '../../../schemas';
import { DEG_TO_RAD } from '../../../shared/geometry';
import { samePoint } from '../host';

/** 向路径追加三次贝塞尔曲线所需的控制点和终点 */
export type EmitCubicCommandInput = {
  /** 靠近当前路径端点的第一控制点 */
  control1: IRPosition;
  /** 靠近曲线终点的第二控制点 */
  control2: IRPosition;
  /** 曲线终点，写入后成为当前路径端点 */
  to: IRPosition;
  /**
   * 终点是否来自自动连接面求交，供后续端点裁剪判断
   * @default false
   */
  sourceAutoBoundary?: boolean;
};

/** 以圆心、半径及角度范围描述待追加的圆弧 */
export type EmitArcCommandInput = {
  /** 圆弧圆心，使用当前路径坐标系 */
  center: IRPosition;
  /** 圆弧半径 */
  radius: number;
  /** 圆弧起始角，单位为度 */
  startAngle: number;
  /** 圆弧终止角，单位为度；对应点成为当前路径端点 */
  endAngle: number;
};

/** 以轴向半径及角度范围描述待追加的椭圆弧 */
export type EmitEllipseArcCommandInput = {
  /** 椭圆中心，使用当前路径坐标系 */
  center: IRPosition;
  /** 椭圆沿 x 轴的半径 */
  radiusX: number;
  /** 椭圆沿 y 轴的半径 */
  radiusY: number;
  /** 椭圆弧起始参数角，单位为度 */
  startAngle: number;
  /** 椭圆弧终止参数角，单位为度；对应点成为当前路径端点 */
  endAngle: number;
};

/** 累积路径命令并同步维护来源、当前端点和边界采样点的写入器 */
export type PathCommandEmitter = {
  /** 按写入顺序累积的场景命令；坐标与半径已应用 round */
  commands: Array<PathCommand>;
  /** 与 commands 同下标的源步骤种类 */
  provenance: Array<string>;
  /** 每条 command 对应的 Source Path step 下标 */
  stepIndexes: Array<number>;
  /** 写入时收集的未舍入端点与控制点；不保证包含曲线全部极值 */
  boundsPoints: Array<IRPosition>;
  /** 记录路径首末端点是否来自自动连接面求交 */
  endpointSource: {
    /** 首条定位或绘制命令记录的自动连接面来源 */
    firstAutoBoundary: boolean;
    /** 最近一次定位或绘制命令记录的自动连接面来源 */
    lastAutoBoundary: boolean;
  };
  /** 读取当前未舍入端点；尚未写入路径时为 null */
  getLastEnd: () => IRPosition | null;
  /** 读取最近一次 move 的未舍入起点；尚未建立子路径时为 null */
  getSubPathStart: () => IRPosition | null;
  /** 追加 move 并同时更新当前端点和子路径起点 */
  emitMove: (p: IRPosition, sourceAutoBoundary?: boolean) => void;
  /** 从当前端点向给定点追加直线 */
  emitLine: (p: IRPosition, sourceAutoBoundary?: boolean) => void;
  /** 追加闭合命令并把当前端点恢复为子路径起点 */
  emitClose: () => void;
  /** 追加二次贝塞尔曲线并记录控制点与终点 */
  emitQuad: (control: IRPosition, p: IRPosition, sourceAutoBoundary?: boolean) => void;
  /** 追加三次贝塞尔曲线并记录两控制点与终点 */
  emitCubic: (input: EmitCubicCommandInput) => void;
  /** 追加圆弧并把终止角对应点设为当前端点 */
  emitArc: (input: EmitArcCommandInput) => void;
  /** 追加椭圆弧并把终止参数角对应点设为当前端点 */
  emitEllipseArc: (input: EmitEllipseArcCommandInput) => void;
  /** 给定点与当前端点不重合时追加 move，否则保留现有子路径 */
  startSegment: (p: IRPosition, sourceAutoBoundary?: boolean) => void;
};

/** 路径命令数值舍入与源步骤追踪所需的回调 */
export type CreatePathCommandEmitterInput = {
  /** 舍入输出命令中的坐标和半径，角度及内部端点保持原值 */
  round: (n: number) => number;
  /** 每次追加命令时读取其来源步骤种类 */
  currentStepKind: () => string;
  /** 每次追加命令时读取其来源步骤下标 */
  currentStepIndex: () => number;
};

/** 创建普通 path emit 的命令写入器 */
export const createPathCommandEmitter = ({
  round,
  currentStepKind,
  currentStepIndex,
}: CreatePathCommandEmitterInput): PathCommandEmitter => {
  const commands: Array<PathCommand> = [];
  const provenance: Array<string> = [];
  const stepIndexes: Array<number> = [];
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
    stepIndexes.push(currentStepIndex());
    boundsPoints.push(p);
    subPathStart = p;
    lastEnd = p;
  };

  const emitLine = (p: IRPosition, sourceAutoBoundary = false): void => {
    noteEndpointSource(sourceAutoBoundary);
    const rp = roundPoint(p);
    commands.push({ kind: 'line', to: [rp[0], rp[1]] });
    provenance.push(currentStepKind());
    stepIndexes.push(currentStepIndex());
    boundsPoints.push(p);
    lastEnd = p;
  };

  const emitClose = (): void => {
    commands.push({ kind: 'close' });
    provenance.push(currentStepKind());
    stepIndexes.push(currentStepIndex());
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
    stepIndexes.push(currentStepIndex());
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
    stepIndexes.push(currentStepIndex());
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
    stepIndexes.push(currentStepIndex());
    const endPoint = pointAtArcAngle(center, radius, endAngle);
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
    stepIndexes.push(currentStepIndex());
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
    stepIndexes,
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
