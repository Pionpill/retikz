import { arcAngleInRange, rayArc } from './arc';
import type { Position } from './point';

/*
 * 圆角轮廓模块：把「闭合有序段序列」(Line / Arc) 的每个接缝（角）替换为与两侧段相切、半径 r 的
 * fillet 圆弧，并支持沿倒角后轮廓发射线求交（连接面感知倒角）。供 polygon / star / sector / rectangle
 * 四形状共享：形状只描述自己的轮廓段，fillet + emit + boundary 全委托此模块。
 *
 * 角度约定与 geometry/arc、ir/path arc 一致（SVG y-down）：0=+x、90=+y(视觉下)、角度递增=屏幕顺时针(CW)。
 * Arc 段 counterClockwise=false（缺省）时从 startAngle 递增扫到 endAngle，true 时递减扫。
 *
 * 内 / 外侧与 sweep 方向：fillet 不区分「形状语义的凸 / 凹」，只看两段在接缝处的转向叉积符号——
 * 凸角 fillet 弧 sweep 与轮廓绕向同向、凹角反向；圆心恒在轮廓内侧（朝转向方向）。
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EPSILON = 1e-9;

/** 直线段：从 from 到 to 的有向线段 */
export type LineSegment = {
  /** 鉴别字面量 */
  kind: 'line';
  /** 起点 [x, y] */
  from: Position;
  /** 终点 [x, y] */
  to: Position;
};

/** 圆弧段：圆心 + 半径 + 起末角（度）+ 扫描方向，与 ir/path arc 同参数化 */
export type ArcSegment = {
  /** 鉴别字面量 */
  kind: 'arc';
  /** 圆心 [x, y] */
  center: Position;
  /** 半径（user units） */
  radius: number;
  /** 起始角度（度，0=+x、90=+y 视觉下） */
  startAngle: number;
  /** 终止角度（度） */
  endAngle: number;
  /** 是否逆时针扫描；缺省 / false = CW（角度递增 / 屏幕顺时针） */
  counterClockwise?: boolean;
};

/** 轮廓段：组成闭合轮廓的最小单元（直线或圆弧） */
export type ContourSegment = LineSegment | ArcSegment;

/** fillet 后用于 emit 的路径命令（与 primitive/path PathCommand 的 move/line/arc/close 子集对齐） */
export type ContourCommand =
  | { kind: 'move'; to: Position }
  | { kind: 'line'; to: Position }
  | {
      kind: 'arc';
      center: Position;
      radius: number;
      startAngle: number;
      endAngle: number;
      counterClockwise?: boolean;
    }
  | { kind: 'close' };

/** 向量长度 */
const length = (v: Position): number => Math.hypot(v[0], v[1]);

/** 归一化（零向量回退 [1, 0]） */
const normalize = (v: Position): Position => {
  const len = length(v);
  if (len < EPSILON) return [1, 0];
  return [v[0] / len, v[1] / len];
};

/** 二维叉积 a × b */
const cross = (a: Position, b: Position): number => a[0] * b[1] - a[1] * b[0];

/** 点 + 角度（度）→ 圆周点 */
const arcPoint = (center: Position, radius: number, angleDeg: number): Position => {
  const rad = angleDeg * DEG_TO_RAD;
  return [center[0] + Math.cos(rad) * radius, center[1] + Math.sin(rad) * radius];
};

/** 段起点 */
const segmentStart = (seg: ContourSegment): Position =>
  seg.kind === 'line' ? seg.from : arcPoint(seg.center, seg.radius, seg.startAngle);

/** 段终点 */
const segmentEnd = (seg: ContourSegment): Position =>
  seg.kind === 'line' ? seg.to : arcPoint(seg.center, seg.radius, seg.endAngle);

/**
 * 段在某端的「行进切线」单位向量
 * @description atStart=true 取起点处沿行进方向的切线，否则取终点处。line 两端切线相同；
 *   arc 切线垂直于半径，方向随 counterClockwise 翻转（CW: (-sinθ, cosθ)，CCW: (sinθ, -cosθ)）。
 */
const tangentAt = (seg: ContourSegment, atStart: boolean): Position => {
  if (seg.kind === 'line') return normalize([seg.to[0] - seg.from[0], seg.to[1] - seg.from[1]]);
  const angleDeg = atStart ? seg.startAngle : seg.endAngle;
  const rad = angleDeg * DEG_TO_RAD;
  const sign = seg.counterClockwise ? -1 : 1;
  return normalize([-Math.sin(rad) * sign, Math.cos(rad) * sign]);
};

/** arc 段的角跨度（带符号：CW 为正递增、CCW 为负），单位度 */
const arcSpan = (seg: ArcSegment): number => seg.endAngle - seg.startAngle;

/**
 * 一个接缝处 fillet 的解算结果
 * @description tangentInPoint = 前段被裁短到此点（前段新终点）；tangentOutPoint = 后段从此点起（后段新起点）；
 *   filletArc 描述连接两切点的圆弧。clampedToZero=true 表示该角夹紧后 r→0，不倒角（保持尖角）。
 */
type FilletSolution = {
  /** 前段切点（前段新终点） */
  tangentInPoint: Position;
  /** 后段切点（后段新起点） */
  tangentOutPoint: Position;
  /** fillet 圆心 */
  center: Position;
  /** fillet 半径 */
  radius: number;
  /** fillet 弧起始角（度，从 center 看 tangentInPoint） */
  startAngle: number;
  /** fillet 弧终止角（度，从 center 看 tangentOutPoint） */
  endAngle: number;
  /** fillet 弧是否逆时针 */
  counterClockwise: boolean;
  /** 夹紧后 r→0，本角不倒（emit 走原尖角） */
  clampedToZero: boolean;
};

/**
 * 把一个点投影到段上、返回沿段的「已走比例」(line: t∈[0,1]；arc: 已扫角 / 总跨度)
 * @description 用于逐角夹紧：校验切点是否落在该段长度（弧用角度）内。返回 fraction 可能 <0 或 >1 表示越界。
 */
const fractionAlong = (seg: ContourSegment, p: Position, fromStart: boolean): number => {
  if (seg.kind === 'line') {
    const ex = seg.to[0] - seg.from[0];
    const ey = seg.to[1] - seg.from[1];
    const len2 = ex * ex + ey * ey;
    if (len2 < EPSILON) return 0;
    // p 在 from→to 上的参数 t；fromStart 量「占整段比例」、否则量「自 to 反向的比例」
    const t = ((p[0] - seg.from[0]) * ex + (p[1] - seg.from[1]) * ey) / len2;
    return fromStart ? t : 1 - t;
  }
  // arc：p 相对圆心的角，量 |从端点到 p 的扫描角| / |总跨度|
  const angle = Math.atan2(p[1] - seg.center[1], p[0] - seg.center[0]) * RAD_TO_DEG;
  const span = Math.abs(arcSpan(seg));
  if (span < EPSILON) return 0;
  const ccw = (seg.counterClockwise ?? false);
  const ref = fromStart ? seg.startAngle : seg.endAngle;
  // 从 ref 出发、沿（fromStart ? 扫描方向 : 反扫描方向）量到 angle 的非负角差
  const goingCcw = fromStart ? ccw : !ccw;
  const raw = goingCcw ? ref - angle : angle - ref;
  let swept = raw % 360;
  if (swept < 0) swept += 360;
  if (swept > 180) swept -= 360; // 取最近表示，越界角可为负
  return swept / span;
};

/**
 * 段的「偏移线 / 弧」：把段朝 fillet 圆心侧平移 / 缩放 r
 * @description fillet 圆心是两段各自偏移 r 后的交点。line 偏移成平行线；arc 偏移成同心弧（半径 ±r）。
 *   返回用于求交的表示（直线 = 过 point 的方向 dir 线；圆 = center + radius）。
 */
type Offset =
  | { kind: 'line'; point: Position; dir: Position } // 过 point、方向 dir 的直线
  | { kind: 'circle'; center: Position; radius: number };

/**
 * 段朝 fillet 圆心侧偏移 r：line→平行线、arc→同心圆。
 * @description fillet 圆心所在侧由接缝转向 turnSign 决定（叉积 tIn×tOut）：凸角圆心在轮廓内侧、
 *   凹角（反向转）圆心在外侧（弧仍嵌入凹槽）。故偏移侧 = 行进方向左手 (-dy, dx) 乘 turnSign 符号。
 *   arc 同心偏移返回 radius−r 主候选；±r 两候选由 offsetSegmentAlt 补齐、求交后按真实距离校验择优。
 */
const offsetSegment = (
  seg: ContourSegment,
  r: number,
  turnSign: number,
  atEnd: boolean,
): Offset => {
  if (seg.kind === 'line') {
    const dir = tangentAt(seg, true);
    // 圆心侧法向 = 行进方向左手 (-dy, dx) × turnSign 符号（凸角内侧 / 凹角外侧）
    const sign = turnSign >= 0 ? 1 : -1;
    const normal: Position = [-dir[1] * sign, dir[0] * sign];
    const base = atEnd ? seg.to : seg.from;
    return { kind: 'line', point: [base[0] + normal[0] * r, base[1] + normal[1] * r], dir };
  }
  // arc 同心偏移：圆心方向 = 从圆周点指向圆心（内法向朝圆心）或反向，取决于转向 vs 弧凸向
  // fillet 圆心到 arc 距离须为 r：若 fillet 圆心在 arc 凸侧外 → radius+r，在凹侧（含圆心侧）→ radius-r。
  // 由 turnSign 与 arc 行进方向共同决定。统一返回两个候选同心圆，求交时择优。
  // 此处返回 radius - r 的同心圆作主候选；offsetSegmentAlt 给 radius + r。
  return { kind: 'circle', center: seg.center, radius: seg.radius - r };
};

/** arc 段内侧偏移的另一候选（radius + r），与 offsetSegment 配合枚举 */
const offsetSegmentAlt = (seg: ArcSegment, r: number): Offset => ({
  kind: 'circle',
  center: seg.center,
  radius: seg.radius + r,
});

/** 直线 ∩ 直线（各以 point + dir 表示），返回交点或 undefined（平行） */
const intersectLineLine = (a: Offset & { kind: 'line' }, b: Offset & { kind: 'line' }): Position | undefined => {
  const det = cross(a.dir, b.dir);
  if (Math.abs(det) < EPSILON) return undefined;
  const dx = b.point[0] - a.point[0];
  const dy = b.point[1] - a.point[1];
  const t = (dx * b.dir[1] - dy * b.dir[0]) / det;
  return [a.point[0] + a.dir[0] * t, a.point[1] + a.dir[1] * t];
};

/** 直线（point+dir）∩ 圆（center,radius），返回交点列（0/1/2 个） */
const intersectLineCircle = (
  line: Offset & { kind: 'line' },
  circle: Offset & { kind: 'circle' },
): Array<Position> => {
  const ox = line.point[0] - circle.center[0];
  const oy = line.point[1] - circle.center[1];
  const ux = line.dir[0];
  const uy = line.dir[1];
  const b = 2 * (ox * ux + oy * uy);
  const c = ox * ox + oy * oy - circle.radius * circle.radius;
  const disc = b * b - 4 * c;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  const out: Array<Position> = [];
  for (const t of [(-b - sq) / 2, (-b + sq) / 2]) {
    out.push([line.point[0] + ux * t, line.point[1] + uy * t]);
  }
  return out;
};

/** 圆 ∩ 圆，返回交点列（0/1/2 个） */
const intersectCircleCircle = (
  a: Offset & { kind: 'circle' },
  b: Offset & { kind: 'circle' },
): Array<Position> => {
  const dx = b.center[0] - a.center[0];
  const dy = b.center[1] - a.center[1];
  const d = Math.hypot(dx, dy);
  if (d < EPSILON || d > a.radius + b.radius + EPSILON || d < Math.abs(a.radius - b.radius) - EPSILON) {
    return [];
  }
  const aa = (a.radius * a.radius - b.radius * b.radius + d * d) / (2 * d);
  const h2 = a.radius * a.radius - aa * aa;
  const h = h2 > 0 ? Math.sqrt(h2) : 0;
  const mx = a.center[0] + (aa * dx) / d;
  const my = a.center[1] + (aa * dy) / d;
  const rx = (-dy * h) / d;
  const ry = (dx * h) / d;
  return [
    [mx + rx, my + ry],
    [mx - rx, my - ry],
  ];
};

/** 点到直线（无限延长）的有符号垂足点 */
const footOnLine = (p: Position, base: Position, dir: Position): Position => {
  const t = (p[0] - base[0]) * dir[0] + (p[1] - base[1]) * dir[1];
  return [base[0] + dir[0] * t, base[1] + dir[1] * t];
};

/**
 * 解算一个接缝（segA 终点 = segB 起点）的 fillet
 * @description segA / segB 至少一为 line（arc-arc 由调用方提前拒绝）。流程：
 *   1. 取接缝点 corner、前段到达切线 tIn、后段离开切线 tOut，叉积 turnSign 定转向（含内侧）。
 *   2. 由两段「内侧偏移 r」求 fillet 圆心：候选交点中挑离两段距离均≈r、且落在 corner 内侧的那个。
 *   3. 圆心到两段的垂足 / 投影点 = 两切点。
 *   4. 逐角夹紧：切点须落在两段剩余长度内（fraction∈[0,1]），越界则缩 r 重解；r→0 标记不倒。
 */
const solveFillet = (segA: ContourSegment, segB: ContourSegment, r: number): FilletSolution => {
  if (segA.kind === 'arc' && segB.kind === 'arc') {
    throw new Error('filletContour: arc-arc seam fillet is not supported');
  }
  const corner = segmentEnd(segA);
  const tIn = tangentAt(segA, false); // 前段终点处行进方向
  const tOut = tangentAt(segB, true); // 后段起点处行进方向
  const turnSign = cross(tIn, tOut);

  const attempt = (radius: number): FilletSolution | undefined => {
    if (radius <= EPSILON) return undefined;
    // 收集 fillet 圆心候选
    const offA = offsetSegment(segA, radius, turnSign, true);
    const offB = offsetSegment(segB, radius, turnSign, false);
    const candidates: Array<Position> = [];
    const pushIntersections = (oa: Offset, ob: Offset): void => {
      if (oa.kind === 'line' && ob.kind === 'line') {
        const p = intersectLineLine(oa, ob);
        if (p) candidates.push(p);
      } else if (oa.kind === 'line' && ob.kind === 'circle') {
        candidates.push(...intersectLineCircle(oa, ob));
      } else if (oa.kind === 'circle' && ob.kind === 'line') {
        candidates.push(...intersectLineCircle(ob, oa));
      } else if (oa.kind === 'circle' && ob.kind === 'circle') {
        candidates.push(...intersectCircleCircle(oa, ob));
      }
    };
    pushIntersections(offA, offB);
    // arc 段有 ±r 两个同心候选，补充枚举
    if (segA.kind === 'arc') pushIntersections(offsetSegmentAlt(segA, radius), offB);
    if (segB.kind === 'arc') pushIntersections(offA, offsetSegmentAlt(segB, radius));
    if (segA.kind === 'arc' && segB.kind === 'arc') {
      pushIntersections(offsetSegmentAlt(segA, radius), offsetSegmentAlt(segB, radius));
    }

    // 挑选：圆心到两段距离均≈radius、两切点都落在各自段参数区间内、且最靠近 corner。
    //   参数区间过滤剔除「落在边延长线上」的伪解（line-arc 时尤其关键）。
    let best:
      | { center: Position; tInPt: Position; tOutPt: Position; inFrac: number; outFrac: number }
      | undefined;
    let bestDist = Infinity;
    for (const cand of candidates) {
      const tInPt = tangentPointOn(segA, cand, radius);
      const tOutPt = tangentPointOn(segB, cand, radius);
      if (!tInPt || !tOutPt) continue;
      // 圆心须真实距两段 == radius
      const dA = distanceToAny(segA, cand);
      const dB = distanceToAny(segB, cand);
      if (Math.abs(dA - radius) > 1e-6 || Math.abs(dB - radius) > 1e-6) continue;
      const inFrac = fractionAlong(segA, tInPt, false); // 从 segA 终点反向量（剩余比例）
      const outFrac = fractionAlong(segB, tOutPt, true); // 从 segB 起点正向量
      // 切点须在段上、且不超过段中点（≤0.5）——每段被两端接缝共享，各占≤半段则两端 fillet 不重叠
      //   （单段双角无重叠的安全充分条件）；负值是延长线伪解，排除。
      if (inFrac < -1e-7 || inFrac > 0.5 + 1e-7 || outFrac < -1e-7 || outFrac > 0.5 + 1e-7) continue;
      const d = Math.hypot(cand[0] - corner[0], cand[1] - corner[1]);
      if (d < bestDist) {
        bestDist = d;
        best = { center: cand, tInPt, tOutPt, inFrac, outFrac };
      }
    }
    if (!best) return undefined;

    // fillet 弧从 tInPt 扫到 tOutPt，方向与轮廓绕向一致：凸角同绕向、凹角反向。
    // atan2 只给 [-180, 180] 主值；跨 ±180° 时需按扫描方向对齐成小弧，避免 SVG/Canvas 走远端大弧。
    const startAngle = Math.atan2(best.tInPt[1] - best.center[1], best.tInPt[0] - best.center[0]) * RAD_TO_DEG;
    const endAngle = Math.atan2(best.tOutPt[1] - best.center[1], best.tOutPt[0] - best.center[0]) * RAD_TO_DEG;
    // turnSign>0（叉积正，y-down 下为顺时针转弯凸角）→ CW（counterClockwise=false）；凹角反向。
    const counterClockwise = turnSign < 0;
    const adjusted = alignSweep(startAngle, endAngle, counterClockwise);
    return {
      tangentInPoint: best.tInPt,
      tangentOutPoint: best.tOutPt,
      center: best.center,
      radius,
      startAngle: adjusted.start,
      endAngle: adjusted.end,
      counterClockwise,
      clampedToZero: false,
    };
  };

  // 逐角夹紧：attempt 只返回切点落在段内（≤半段）的合法 fillet。请求 r 直接合法则原值采用；
  //   否则在 [0, r] 二分搜索最大可行半径——取最大可行 fillet（而非折半到首个合法值），
  //   使边界几何与渲染 clamp 对齐（正方角下 = min(w/2,h/2)）。仍无解则本角不倒。
  const direct = attempt(r);
  if (direct) return direct;
  let lo = 0;
  let hi = r;
  let bestSolution: FilletSolution | undefined;
  for (let iter = 0; iter < 48; iter++) {
    const mid = (lo + hi) / 2;
    const sol = attempt(mid);
    if (sol) {
      bestSolution = sol;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  if (bestSolution) return bestSolution;
  // 夹紧到 0：本角不倒
  return {
    tangentInPoint: corner,
    tangentOutPoint: corner,
    center: corner,
    radius: 0,
    startAngle: 0,
    endAngle: 0,
    counterClockwise: false,
    clampedToZero: true,
  };
};

/** 点到段（line / arc 所在直线 / 圆）的距离 */
const distanceToAny = (seg: ContourSegment, p: Position): number => {
  if (seg.kind === 'line') {
    const dir = tangentAt(seg, true);
    const foot = footOnLine(p, seg.from, dir);
    return Math.hypot(p[0] - foot[0], p[1] - foot[1]);
  }
  const d = Math.hypot(p[0] - seg.center[0], p[1] - seg.center[1]);
  return Math.abs(d - seg.radius);
};

/**
 * fillet 圆心 → 段上切点
 * @description line：圆心在直线上的垂足。arc：圆心与 arc 圆心连线 ∩ arc 圆周（朝 fillet 圆心一侧）。
 *   切点须落在段几何上（line 在线上、arc 在弧角度区间内）才有效，否则返回 undefined。
 */
const tangentPointOn = (seg: ContourSegment, filletCenter: Position, radius: number): Position | undefined => {
  if (seg.kind === 'line') {
    const dir = tangentAt(seg, true);
    return footOnLine(filletCenter, seg.from, dir);
  }
  // arc：切点在 arc 圆周上、位于 arc 圆心 → fillet 圆心 方向（或反向，取较近 fillet 圆心者）
  const vx = filletCenter[0] - seg.center[0];
  const vy = filletCenter[1] - seg.center[1];
  const d = Math.hypot(vx, vy);
  if (d < EPSILON) return undefined;
  const ux = vx / d;
  const uy = vy / d;
  // fillet 圆心在 arc 外（d≈radius+r）→ 切点朝 fillet 圆心；在内（d≈radius−r）→ 同向（仍朝外推 arc.radius）
  const candidates: Array<Position> = [
    [seg.center[0] + ux * seg.radius, seg.center[1] + uy * seg.radius],
    [seg.center[0] - ux * seg.radius, seg.center[1] - uy * seg.radius],
  ];
  let best: Position | undefined;
  let bestErr = Infinity;
  for (const cand of candidates) {
    const angle = Math.atan2(cand[1] - seg.center[1], cand[0] - seg.center[0]) * RAD_TO_DEG;
    if (!arcAngleInRange(seg.startAngle, seg.endAngle, angle, 1e-6)) continue;
    // 切点到 fillet 圆心距离应 ≈ radius
    const err = Math.abs(Math.hypot(cand[0] - filletCenter[0], cand[1] - filletCenter[1]) - radius);
    if (err < bestErr) {
      bestErr = err;
      best = cand;
    }
  }
  return bestErr <= 1e-6 ? best : undefined;
};

/**
 * 对闭合轮廓的每个接缝做 fillet，返回 fillet 解算列表（与接缝一一对应，下标 i = 段 i 终点接段 (i+1)%n 起点）
 * @description cornerRadius 省略 / ≤0 → 返回空数组（调用方据此 passthrough 原段序列）。arc-arc 接缝抛错。
 */
export const filletContour = (
  segments: Array<ContourSegment>,
  cornerRadius?: number,
): Array<FilletSolution> => {
  if (cornerRadius === undefined || cornerRadius <= 0 || segments.length < 2) return [];
  const n = segments.length;
  const out: Array<FilletSolution> = [];
  for (let i = 0; i < n; i++) {
    const segA = segments[i];
    const segB = segments[(i + 1) % n];
    out.push(solveFillet(segA, segB, cornerRadius));
  }
  return out;
};

/**
 * 把闭合轮廓 + cornerRadius emit 成路径命令（move + 缩短 line + 裁剪原 arc + fillet arc + close）
 * @description cornerRadius 省略 / ≤0 → 直接 emit 原始尖角轮廓（passthrough）。否则每段从「上一接缝的
 *   fillet 出点」走到「本接缝的 fillet 入点」（line 缩短 / arc 裁剪角度），接缝处插 fillet 弧。
 *   夹紧到 0 的角不插弧、按原尖角连接。
 */
export const contourCommands = (
  segments: Array<ContourSegment>,
  cornerRadius?: number,
): Array<ContourCommand> => {
  const n = segments.length;
  if (n === 0) return [];
  const fillets = filletContour(segments, cornerRadius);

  // passthrough：原尖角轮廓
  if (fillets.length === 0) {
    const cmds: Array<ContourCommand> = [];
    segments.forEach((seg, i) => {
      if (i === 0) cmds.push({ kind: 'move', to: segmentStart(seg) });
      emitSegmentBody(seg, segmentStart(seg), segmentEnd(seg), cmds);
    });
    cmds.push({ kind: 'close' });
    return cmds;
  }

  const cmds: Array<ContourCommand> = [];
  // 段 i 的有效起点 = 上一接缝 fillet 出点（若该接缝未夹零），有效终点 = 本接缝 fillet 入点
  for (let i = 0; i < n; i++) {
    const seg = segments[i];
    const prevFillet = fillets[(i - 1 + n) % n];
    const thisFillet = fillets[i];
    const start = prevFillet.clampedToZero ? segmentStart(seg) : prevFillet.tangentOutPoint;
    const end = thisFillet.clampedToZero ? segmentEnd(seg) : thisFillet.tangentInPoint;
    if (i === 0) cmds.push({ kind: 'move', to: start });
    emitSegmentBody(seg, start, end, cmds);
    if (!thisFillet.clampedToZero) {
      cmds.push({
        kind: 'arc',
        center: thisFillet.center,
        radius: thisFillet.radius,
        startAngle: thisFillet.startAngle,
        endAngle: thisFillet.endAngle,
        counterClockwise: thisFillet.counterClockwise,
      });
    }
  }
  cmds.push({ kind: 'close' });
  return cmds;
};

/** emit 单段主体（line → line 命令到 end；arc → 裁剪角度的 arc 命令到 end），起点由调用方先 move/前段给出 */
const emitSegmentBody = (
  seg: ContourSegment,
  start: Position,
  end: Position,
  cmds: Array<ContourCommand>,
): void => {
  if (seg.kind === 'line') {
    cmds.push({ kind: 'line', to: end });
    return;
  }
  // arc：起点角 / 终点角 = start / end 相对圆心的角，扫描方向不变
  const startAngle = Math.atan2(start[1] - seg.center[1], start[0] - seg.center[0]) * RAD_TO_DEG;
  const endAngle = Math.atan2(end[1] - seg.center[1], end[0] - seg.center[0]) * RAD_TO_DEG;
  const adjusted = alignSweep(startAngle, endAngle, seg.counterClockwise ?? false);
  cmds.push({
    kind: 'arc',
    center: seg.center,
    radius: seg.radius,
    startAngle: adjusted.start,
    endAngle: adjusted.end,
    counterClockwise: seg.counterClockwise,
  });
};

/** 调整 endAngle 使「start→end」沿给定扫描方向（ccw: 递减 / 否则递增），保持裁剪后弧方向不变 */
const alignSweep = (start: number, end: number, ccw: boolean): { start: number; end: number } => {
  let e = end;
  if (ccw) {
    while (e > start) e -= 360;
    while (e <= start - 360) e += 360;
  } else {
    while (e < start) e += 360;
    while (e >= start + 360) e -= 360;
  }
  return { start, end: e };
};

/**
 * 从 rayOrigin 朝 toward 射线 ∩ fillet 后轮廓全部段，返回最近正向交点
 * @description rayOrigin 显式传（不假设中心）；toward 是射线指向的目标点（方向 = toward − rayOrigin）。
 *   遍历 fillet 后的有效段（缩短 line / 裁剪 arc / fillet arc），对每段求 ray∩段、取最小正参数命中点。
 *   cornerRadius 省略 / ≤0 → 走原尖角轮廓。无命中返回 undefined（调用方兜底）。
 */
export const boundaryFromContour = (
  segments: Array<ContourSegment>,
  cornerRadius: number | undefined,
  rayOrigin: Position,
  toward: Position,
): Position | undefined => {
  const dirRaw: Position = [toward[0] - rayOrigin[0], toward[1] - rayOrigin[1]];
  const dl = length(dirRaw);
  if (dl < 1e-12) return undefined;
  const dir: Position = [dirRaw[0] / dl, dirRaw[1] / dl];

  const n = segments.length;
  const fillets = filletContour(segments, cornerRadius);
  let best = Infinity;

  const considerLine = (a: Position, b: Position): void => {
    // ray(rayOrigin + s·dir) ∩ segment[a,b]
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const det = dir[0] * -ey - -ex * dir[1];
    if (Math.abs(det) < 1e-12) return;
    const ax = a[0] - rayOrigin[0];
    const ay = a[1] - rayOrigin[1];
    const s = (ax * -ey - -ex * ay) / det;
    const t = (dir[0] * ay - ax * dir[1]) / det;
    if (s <= 1e-9 || s >= best) return;
    if (t >= -1e-9 && t <= 1 + 1e-9) best = s;
  };

  const considerArc = (
    center: Position,
    radius: number,
    startAngle: number,
    endAngle: number,
    ccw: boolean,
  ): void => {
    // 把 (start, end) 规范成与 ccw 一致的有向区间（end 落在 start 同向的 [0,360) 内），
    //   再喂 rayArc——arcAngleInRange 据 end−start 的符号判扫描方向，必须与 ccw 自洽。
    const aligned = alignSweep(startAngle, endAngle, ccw);
    const hits = rayArc(rayOrigin, dir, center, radius, aligned.start, aligned.end);
    for (const s of hits) {
      if (s > 1e-9 && s < best) best = s;
    }
  };

  if (fillets.length === 0) {
    for (let i = 0; i < n; i++) {
      const seg = segments[i];
      if (seg.kind === 'line') considerLine(seg.from, seg.to);
      else considerArc(seg.center, seg.radius, seg.startAngle, seg.endAngle, seg.counterClockwise ?? false);
    }
  } else {
    for (let i = 0; i < n; i++) {
      const seg = segments[i];
      const prevFillet = fillets[(i - 1 + n) % n];
      const thisFillet = fillets[i];
      const start = prevFillet.clampedToZero ? segmentStart(seg) : prevFillet.tangentOutPoint;
      const end = thisFillet.clampedToZero ? segmentEnd(seg) : thisFillet.tangentInPoint;
      if (seg.kind === 'line') {
        considerLine(start, end);
      } else {
        const sA = Math.atan2(start[1] - seg.center[1], start[0] - seg.center[0]) * RAD_TO_DEG;
        const eA = Math.atan2(end[1] - seg.center[1], end[0] - seg.center[0]) * RAD_TO_DEG;
        const aligned = alignSweep(sA, eA, seg.counterClockwise ?? false);
        considerArc(seg.center, seg.radius, aligned.start, aligned.end, seg.counterClockwise ?? false);
      }
      if (!thisFillet.clampedToZero) {
        considerArc(
          thisFillet.center,
          thisFillet.radius,
          thisFillet.startAngle,
          thisFillet.endAngle,
          thisFillet.counterClockwise,
        );
      }
    }
  }

  if (!Number.isFinite(best)) return undefined;
  return [rayOrigin[0] + dir[0] * best, rayOrigin[1] + dir[1] * best];
};
