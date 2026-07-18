import type { Position } from '@retikz/math';

import { z } from 'zod';

import type { ScenePrimitive, ShapeAnchorName } from '../../contract';
import type { ContourSegment, Rect } from '../../shared';

import { defineShape } from '../../contract';
import { boundaryFromContour, contourCommands, DEG_TO_RAD, localToWorld } from '../../shared';
import { contourToPathCommands, contourToPathPrimitive, verticesToSegments } from './outline';

const MAX_STAR_POINTS = 1024;

const starParamsSchema = z
  .strictObject({
    points: z
      .number()
      .int()
      .min(3)
      .max(MAX_STAR_POINTS)
      .describe(`Number of star points (3..${MAX_STAR_POINTS}); capped to bound vertex count (mirrors polygon sides).`),
    innerRadius: z.number().positive().describe('Inner (notch) radius in user units.'),
    outerRadius: z.number().positive().describe('Outer (tip) radius in user units; must be > innerRadius.'),
    rotate: z
      .number()
      .optional()
      .describe(
        'Shape self-rotation in degrees; default 0 = first tip points up (screen -y / top); positive rotates clockwise (screen). Composes with Node.rotate.',
      ),
    cornerRadius: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
      ),
  })
  .refine(p => p.outerRadius > p.innerRadius, {
    message: 'outerRadius must be greater than innerRadius',
  });

type StarParams = z.infer<typeof starParamsSchema>;

/**
 * star 派生几何
 * @description 顶点在内外半径间交替分布，AABB 半轴由顶点范围得到；星形中心恒为局部原点
 */
type StarGeometry = {
  /** `2×points` 个顶点局部坐标（中心为原点，偶 index = 尖角、奇 index = 凹角） */
  vertices: Array<Position>;
  /** 精确 AABB 半轴（circumscribe 输出；星形关于中心对称 → AABB 中心即原点） */
  aabbHalfAxes: { halfWidth: number; halfHeight: number };
};

/**
 * 计算 star 顶点和 AABB 半轴
 * @description 默认第一尖角朝上；rotate 只改变自旋角
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
 * 世界系顶点环
 * @description 保持 starGeometry 的尖角 / 凹角交替顺序
 */
const worldVertices = (rect: Rect, geo: StarGeometry): Array<Position> => geo.vertices.map(v => toWorld(rect, v));

/**
 * star 注册项：尖角和凹角交替的闭合多边形
 * @description 尺寸由 inner/outerRadius 驱动；cornerRadius 对顶点倒角。
 *   anchor 提供 tip-N / notch-N；scaleParams 只缩长度参数
 */
export const star = defineShape<StarParams>({
  name: 'star',
  paramsSchema: starParamsSchema,
  circumscribe: (_hw, _hh, params) => starGeometry(params).aabbHalfAxes,
  boundaryPoint: (rect: Rect, toward: Position, params): Position => {
    const geo = starGeometry(params);
    // 带 rotate 的 rect 下取世界系顶点环；rayOrigin = 星形几何中心（= rect 中心 = node position，星形关于中心对称）。
    const verts = worldVertices(rect, geo);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
    const center: Position = toWorld(rect, [0, 0]);
    const hit = boundaryFromContour(segments, params.cornerRadius, center, toward);
    return hit ?? center;
  },
  anchor: (rect: Rect, name: ShapeAnchorName, params): Position | undefined => {
    const geo = starGeometry(params);
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
  *emit(rect: Rect, style, round, params): Iterable<ScenePrimitive> {
    const geo = starGeometry(params);
    // emit 收轴对齐 rect（rotate=0）；顶点世界坐标 → 折线段 → rounded-contour 命令 → path
    const verts = worldVertices(rect, geo);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
    const commands = contourToPathCommands(contourCommands(segments, params.cornerRadius), round);
    yield contourToPathPrimitive(commands, style);
  },
  // 半径 / cornerRadius 是长度（随 scale 协同放大，几何均值因子）；points 是计数、rotate 是角度——均不随 scale 缩。
  scaleParams: (params, sx: number, sy: number) => {
    const factor = Math.sqrt(sx * sy);
    return {
      ...params,
      innerRadius: params.innerRadius * factor,
      outerRadius: params.outerRadius * factor,
      ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * factor }),
    };
  },
});
