import { z } from 'zod';
import { localToWorld } from '../geometry/transform';
import type { Position } from '../geometry/point';
import type { Rect } from '../geometry/rect';
import {
  type ContourSegment,
  boundaryFromContour,
  contourCommands,
} from '../geometry/contour';
import type { ScenePrimitive } from '../primitive';
import { contourToPathCommands, verticesToSegments } from './contour';
import { defineShape } from './define';

/**
 * star shape 的 per-instance params 类型
 * @description 由 paramsSchema z.infer 派生（单一来源 zod）；points = 尖角数（≥3），
 *   innerRadius / outerRadius = 凹角 / 尖角半径（长度），rotate = 起始尖角自旋角（度，可选），
 *   cornerRadius = 顶点倒角半径（user units，可选，逐角夹紧；凸尖与凹角都倒）。
 *   星形为外径尖角 / 内径凹角交替的 `2×points` 顶点闭合多边形。
 */
type StarParams = {
  points: number;
  innerRadius: number;
  outerRadius: number;
  rotate?: number;
  cornerRadius?: number;
};

const DEG_TO_RAD = Math.PI / 180;

/**
 * star 派生几何（circumscribe / boundaryPoint / anchor / emit 单一真源）
 * @description `2×points` 个顶点的局部坐标（绕中心、外径尖角与内径凹角交替均布、按 rotate 定起始），
 *   外加由顶点 min/max 算出的精确 AABB 半轴。顶点 k（k=0..2·points−1）角 = rotate + k·(180/points) − 90，
 *   偶 k 取 outerRadius（尖角 tip）、奇 k 取 innerRadius（凹角 notch）；默认（rotate:0）第一尖角朝上（−y）。
 *   中心局部原点恒为 [0,0]
 *   （星形关于中心对称，AABB 中心 = 星形中心 = node position，无 circumscribeOffset）。
 */
type StarGeometry = {
  /** `2×points` 个顶点局部坐标（中心为原点，偶 index = 尖角、奇 index = 凹角） */
  vertices: Array<Position>;
  /** 精确 AABB 半轴（circumscribe 输出；星形关于中心对称 → AABB 中心即原点） */
  aabbHalfAxes: { halfWidth: number; halfHeight: number };
};

/**
 * 计算 star 单一真源几何
 * @description 局部系以中心为原点：顶点 k 角 = (rotate ?? 0) + k·(180/points) − 90，半径偶 outer / 奇 inner，
 *   point = [r·cosθ, r·sinθ]（0°=+x，90°=+y screen y-down）。−90 基准使默认第一尖角朝上（−y）。
 *   AABB 半轴 = 各顶点 |x| / |y| 的最大值（对称 → 中心即原点）。
 */
const starGeometry = (params: StarParams): StarGeometry => {
  const { points, innerRadius, outerRadius } = params;
  const rotate = params.rotate ?? 0;
  // 顶点总数 = 2·points（外径尖角 / 内径凹角交替），步进 = 180/points 度。
  const step = 180 / points;
  const vertices: Array<Position> = [];
  let maxAbsX = 0;
  let maxAbsY = 0;
  for (let k = 0; k < 2 * points; k++) {
    const angle = (rotate + k * step - 90) * DEG_TO_RAD;
    const radius = k % 2 === 0 ? outerRadius : innerRadius;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    vertices.push([x, y]);
    if (Math.abs(x) > maxAbsX) maxAbsX = Math.abs(x);
    if (Math.abs(y) > maxAbsY) maxAbsY = Math.abs(y);
  }
  // 星形关于中心对称 → AABB 中心 = 原点，半轴 = 各顶点 |x| / |y| 最大值。
  return {
    vertices,
    aabbHalfAxes: { halfWidth: maxAbsX, halfHeight: maxAbsY },
  };
};

/** 局部顶点（中心为原点）→ 世界系（经 rect 旋转 / 平移） */
const toWorld = (rect: Rect, local: Position): Position => localToWorld(rect, local);

/**
 * 世界系顶点环（局部 2×points 顶点逐个经 rect 投世界）
 * @description emit 收轴对齐 rect（rotate=0）、boundaryPoint 收带 rotate 的 rect，二者共用此构造；
 *   绕向 = starGeometry 顶点顺序（偶尖 / 奇凹交替），供 verticesToSegments → rounded-contour 模块倒角。
 */
const worldVertices = (rect: Rect, geo: StarGeometry): Array<Position> =>
  geo.vertices.map(v => toWorld(rect, v));

/**
 * star 注册项：星形（外径尖角 / 内径凹角交替的 2×points 顶点闭合多边形）
 * @description params-半径驱动的纯几何形状（像 sector，尺寸由 outerRadius 定、忽略文本内框）：四何函数共用
 *   `starGeometry`（单一真源）。circumscribe 返回含全部尖角的精确 AABB 半轴（随 rotate 变，不随 cornerRadius 变）；
 *   星形关于中心对称 → AABB 中心 = 星形中心 = node position，无需 circumscribeOffset。emit / boundaryPoint 把
 *   `2×points` 顶点环构造成折线段，委托 rounded-contour 模块：cornerRadius 省略 / 0 出原尖角轮廓、>0 在每个顶点
 *   插逐角夹紧的 fillet 弧——凸尖与凹角（notch）由模块按接缝转向叉积统一处理（凹角弧 sweep 反向、圆心在凸侧），
 *   emit 与 boundaryPoint 共用同一份 fillet 结果。emit 收轴对齐 rect（旋转由外层 group 施加）、boundaryPoint
 *   收带 rotate 的 rect 且 rayOrigin = 星形几何中心（关于中心对称，AABB 中心 = 形心 = node position）。
 *   anchor 含 center / tip-N（第 N 尖角）/ notch-N（第 N 凹角）——恒在原尖角 / 凹角逻辑顶点，不随 cornerRadius 移；
 *   self-rotate（params.rotate）与 Node.rotate 叠加。scaleParams 只缩 inner/outerRadius / cornerRadius（长度）、
 *   不缩 points（计数）/ rotate（角度）。
 */
export const star = defineShape({
  paramsSchema: z
    .strictObject({
      points: z
        .number()
        .int()
        .min(3)
        .describe('Number of star points (>= 3).'),
      innerRadius: z
        .number()
        .finite()
        .positive()
        .describe('Inner (notch) radius in user units.'),
      outerRadius: z
        .number()
        .finite()
        .positive()
        .describe('Outer (tip) radius in user units; must be > innerRadius.'),
      rotate: z
        .number()
        .finite()
        .optional()
        .describe('Shape self-rotation in degrees; default 0 = first tip points up (screen -y / top); positive rotates clockwise (screen). Composes with Node.rotate.'),
      cornerRadius: z
        .number()
        .finite()
        .nonnegative()
        .optional()
        .describe(
          'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
        ),
    })
    .refine(p => p.outerRadius > p.innerRadius, {
      message: 'outerRadius must be greater than innerRadius',
    }),
  circumscribe: (_hw, _hh, params: StarParams) => starGeometry(params).aabbHalfAxes,
  boundaryPoint: (rect: Rect, toward: Position, params: StarParams): Position => {
    const geo = starGeometry(params);
    // 带 rotate 的 rect 下取世界系顶点环；rayOrigin = 星形几何中心（= rect 中心 = node position，星形关于中心对称）。
    const verts = worldVertices(rect, geo);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
    const center: Position = toWorld(rect, [0, 0]);
    const hit = boundaryFromContour(segments, params.cornerRadius, center, toward);
    return hit ?? center;
  },
  anchor: (rect: Rect, name: string, params: StarParams): Position | undefined => {
    const geo = starGeometry(params);
    if (name === 'center') return toWorld(rect, [0, 0]);
    // tip-N → 顶点 2N（尖角）；notch-N → 顶点 2N+1（凹角）。范围越界返回 undefined。
    const tip = /^tip-(\d+)$/.exec(name);
    if (tip) {
      const index = 2 * Number(tip[1]);
      if (index >= geo.vertices.length) return undefined;
      return toWorld(rect, geo.vertices[index]);
    }
    const notch = /^notch-(\d+)$/.exec(name);
    if (notch) {
      const index = 2 * Number(notch[1]) + 1;
      if (index >= geo.vertices.length) return undefined;
      return toWorld(rect, geo.vertices[index]);
    }
    return undefined;
  },
  *emit (rect: Rect, style, round, params: StarParams): Iterable<ScenePrimitive> {
    const geo = starGeometry(params);
    // emit 收轴对齐 rect（rotate=0）；顶点世界坐标 → 折线段 → rounded-contour 命令 → path
    const verts = worldVertices(rect, geo);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
    const commands = contourToPathCommands(contourCommands(segments, params.cornerRadius), round);
    yield {
      type: 'path',
      commands,
      fill: style.fill ?? 'transparent',
      fillOpacity: style.fillOpacity,
      stroke: style.stroke ?? 'currentColor',
      strokeOpacity: style.strokeOpacity,
      strokeWidth: style.strokeWidth ?? 1,
      dashPattern: style.dashPattern,
      opacity: style.opacity,
    };
  },
  // 半径 / cornerRadius 是长度（随 scale 协同放大，几何均值因子）；points 是计数、rotate 是角度——均不随 scale 缩。
  scaleParams: (params: StarParams, sx: number, sy: number): StarParams => {
    const factor = Math.sqrt(sx * sy);
    return {
      ...params,
      innerRadius: params.innerRadius * factor,
      outerRadius: params.outerRadius * factor,
      ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * factor }),
    };
  },
});
