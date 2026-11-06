import { DEG_TO_RAD, pointAtArcAngle } from '@retikz/math';

import type { PathCommand, CubicPathCommand, ArcPathCommand, EllipseArcPathCommand } from '../../../../contract';
import type { CanonicalPathStep } from '../../../../resolve';
import type { IRPosition } from '../../../../schemas';
import { isSamePoint } from '../../target';

/** 向路径追加三次贝塞尔曲线所需的控制点和终点 */
type InputCubicCommandEmission = Pick<CubicPathCommand, 'control1' | 'control2' | 'to'> & {
  /**
   * 终点是否来自自动连接面求交，供后续端点裁剪判断
   * @default false
   */
  sourceAutoBoundary?: boolean;
};

/** 以圆心、半径及角度范围描述待追加的圆弧 */
type InputArcCommandEmission = Pick<ArcPathCommand, 'center' | 'radius' | 'startAngle' | 'endAngle'>;

/** 以轴向半径及角度范围描述待追加的椭圆弧 */
type InputEllipseArcCommandEmission = Pick<
  EllipseArcPathCommand,
  'center' | 'radiusX' | 'radiusY' | 'startAngle' | 'endAngle'
>;

/** 累积路径命令并同步维护来源、当前端点和边界采样点的写入器 */
export class PathCommandEmitter {
  /** 按写入顺序累积的场景命令；坐标与半径已应用 round */
  readonly commands: Array<PathCommand> = [];
  /** 与 commands 同下标的源步骤种类 */
  readonly provenance: Array<string> = [];
  /** 每条 command 对应的 Source Path step 下标 */
  readonly stepIndexes: Array<number> = [];
  /** 写入时收集的未舍入端点与控制点；不保证包含曲线全部极值 */
  readonly boundsPoints: Array<IRPosition> = [];
  /** 记录路径首末端点是否来自自动连接面求交 */
  readonly endpointSource = {
    /** 首条定位或绘制命令记录的自动连接面来源 */
    firstAutoBoundary: false,
    /** 最近一次定位或绘制命令记录的自动连接面来源 */
    lastAutoBoundary: false,
  };
  /** 舍入输出命令中的坐标和半径，角度及内部端点保持原值 */
  private readonly round: (value: number) => number;
  /** 当前写入命令所属的源步骤种类 */
  private currentStepKind: CanonicalPathStep['kind'] = 'move';
  /** 当前写入命令所属的源步骤下标 */
  private currentStepIndex = -1;
  /** 当前未舍入端点 */
  private lastEnd: IRPosition | null = null;
  /** 最近一次 move 的未舍入起点 */
  private subPathStart: IRPosition | null = null;

  /** 创建使用指定数值精度的命令写入器 */
  constructor(round: (value: number) => number) {
    this.round = round;
  }

  /** 设置后续追加命令的源步骤 */
  beginStep(sourceStepIndex: number, stepKind: CanonicalPathStep['kind']): void {
    this.currentStepIndex = sourceStepIndex;
    this.currentStepKind = stepKind;
  }

  /** 读取当前未舍入端点；尚未写入路径时为 null */
  getLastEnd(): IRPosition | null {
    return this.lastEnd;
  }

  /** 读取最近一次 move 的未舍入起点；尚未建立子路径时为 null */
  getSubPathStart(): IRPosition | null {
    return this.subPathStart;
  }

  /** 追加 move 并同时更新当前端点和子路径起点 */
  emitMove(p: IRPosition, sourceAutoBoundary = false): void {
    this.noteEndpointSource(sourceAutoBoundary);
    const rp = this.roundPoint(p);
    this.commands.push({ kind: 'move', to: [rp[0], rp[1]] });
    this.provenance.push(this.currentStepKind);
    this.stepIndexes.push(this.currentStepIndex);
    this.boundsPoints.push(p);
    this.subPathStart = p;
    this.lastEnd = p;
  }

  /** 从当前端点向给定点追加直线 */
  emitLine(p: IRPosition, sourceAutoBoundary = false): void {
    this.noteEndpointSource(sourceAutoBoundary);
    const rp = this.roundPoint(p);
    this.commands.push({ kind: 'line', to: [rp[0], rp[1]] });
    this.provenance.push(this.currentStepKind);
    this.stepIndexes.push(this.currentStepIndex);
    this.boundsPoints.push(p);
    this.lastEnd = p;
  }

  /** 追加闭合命令并把当前端点恢复为子路径起点 */
  emitClose(): void {
    this.commands.push({ kind: 'close' });
    this.provenance.push(this.currentStepKind);
    this.stepIndexes.push(this.currentStepIndex);
    this.lastEnd = this.subPathStart;
  }

  /** 追加二次贝塞尔曲线并记录控制点与终点 */
  emitQuad(control: IRPosition, p: IRPosition, sourceAutoBoundary = false): void {
    this.noteEndpointSource(sourceAutoBoundary);
    const rc = this.roundPoint(control);
    const rp = this.roundPoint(p);
    this.commands.push({
      kind: 'quad',
      control: [rc[0], rc[1]],
      to: [rp[0], rp[1]],
    });
    this.provenance.push(this.currentStepKind);
    this.stepIndexes.push(this.currentStepIndex);
    this.boundsPoints.push(control);
    this.boundsPoints.push(p);
    this.lastEnd = p;
  }

  /** 追加三次贝塞尔曲线并记录两控制点与终点 */
  emitCubic({ control1, control2, to, sourceAutoBoundary = false }: InputCubicCommandEmission): void {
    this.noteEndpointSource(sourceAutoBoundary);
    const rc1 = this.roundPoint(control1);
    const rc2 = this.roundPoint(control2);
    const rp = this.roundPoint(to);
    this.commands.push({
      kind: 'cubic',
      control1: [rc1[0], rc1[1]],
      control2: [rc2[0], rc2[1]],
      to: [rp[0], rp[1]],
    });
    this.provenance.push(this.currentStepKind);
    this.stepIndexes.push(this.currentStepIndex);
    this.boundsPoints.push(control1);
    this.boundsPoints.push(control2);
    this.boundsPoints.push(to);
    this.lastEnd = to;
  }

  /** 追加圆弧并把终止角对应点设为当前端点 */
  emitArc({ center, radius, startAngle, endAngle }: InputArcCommandEmission): void {
    this.noteEndpointSource(false);
    const rc = this.roundPoint(center);
    this.commands.push({
      kind: 'arc',
      center: [rc[0], rc[1]],
      radius: this.round(radius),
      startAngle,
      endAngle,
    });
    this.provenance.push(this.currentStepKind);
    this.stepIndexes.push(this.currentStepIndex);
    const endPoint = pointAtArcAngle(center, radius, endAngle);
    this.boundsPoints.push(endPoint);
    this.lastEnd = endPoint;
  }

  /** 追加椭圆弧并把终止参数角对应点设为当前端点 */
  emitEllipseArc({ center, radiusX, radiusY, startAngle, endAngle }: InputEllipseArcCommandEmission): void {
    this.noteEndpointSource(false);
    const rc = this.roundPoint(center);
    this.commands.push({
      kind: 'ellipseArc',
      center: [rc[0], rc[1]],
      radiusX: this.round(radiusX),
      radiusY: this.round(radiusY),
      startAngle,
      endAngle,
    });
    this.provenance.push(this.currentStepKind);
    this.stepIndexes.push(this.currentStepIndex);
    const endPt: IRPosition = [
      center[0] + Math.cos(endAngle * DEG_TO_RAD) * radiusX,
      center[1] + Math.sin(endAngle * DEG_TO_RAD) * radiusY,
    ];
    this.boundsPoints.push(endPt);
    this.lastEnd = endPt;
  }

  /** 给定点与当前端点不重合时追加 move，否则保留现有子路径 */
  startSegment(p: IRPosition, sourceAutoBoundary = false): void {
    if (isSamePoint(p, this.lastEnd)) return;
    this.emitMove(p, sourceAutoBoundary);
  }

  /** 将点坐标舍入至输出精度 */
  private roundPoint(point: IRPosition): IRPosition {
    return [this.round(point[0]), this.round(point[1])];
  }

  /** 同步首末端点的自动连接面来源 */
  private noteEndpointSource(sourceAutoBoundary: boolean): void {
    if (this.commands.length === 0) this.endpointSource.firstAutoBoundary = sourceAutoBoundary;
    this.endpointSource.lastAutoBoundary = sourceAutoBoundary;
  }
}
