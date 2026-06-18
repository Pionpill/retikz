import { PlotCoordinate } from '../ir';
import { isFiniteNumber } from '../data/field';
import { ternaryCellContour } from './cell';
import type { Cell, CellGeometry } from './cell';
import type { DimensionRole } from './types';

export type TernaryVertices = [[number, number], [number, number], [number, number]];

/** 三元帧（重心坐标）：三连续分量 x/y/z 归一化后按重心坐标投影到等边三角内 */
export type ResolvedTernary2DCoordinate = {
  /** 判别字段：2D 三元 */
  type: typeof PlotCoordinate.Ternary2D;
  /** 位置角色序（[x, y, z]，3 通道） */
  roles: ReadonlyArray<DimensionRole>;
  /** 三角顶点（屏幕坐标）：[Vx, Vy, Vz] */
  vertices: TernaryVertices;
  /** 投影别名（2 入参形态对三元无意义，恒返回 null）：三元须走 projectRoles */
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
  /** N 通道投影：roles 长度 3，传 [x, y, z] → 归一化 + 重心坐标屏幕点；非有限 → null（跳过）、含负 / 和≤0 → throw（fail-loud） */
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null;
  /** 三轴 cell → 三元 simplex 裁剪后的 contour */
  projectCell: (cell: Cell) => CellGeometry;
};

/**
 * 建三元帧：重心投影 + 自动归一化（容忍任意正三元组）
 * @description 每行 (x,y,z) 先归一化 s=x+y+z、(x/s,y/s,z/s)，再 nx·Vx + ny·Vy + nz·Vz 得屏幕点。
 *   非有限值（缺字段 / NaN）→ null 跳过该点（与其它坐标系一致）；含负分量 / 和≤0 → fail-loud（数据错误、不静默归一）。
 */
export const createTernary2DCoordinate = (vertices: TernaryVertices): ResolvedTernary2DCoordinate => {
  const [vx, vy, vz] = vertices;
  const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const x = values[0];
    const y = values[1];
    const z = values[2];
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) return null;
    if (x < 0 || y < 0 || z < 0) {
      throw new Error(`lowerPlots: ternary coordinate requires non-negative components (got x=${x}, y=${y}, z=${z})`);
    }
    const sum = x + y + z;
    if (sum <= 0) {
      throw new Error(`lowerPlots: ternary coordinate requires x+y+z > 0 (got x=${x}, y=${y}, z=${z})`);
    }
    // 各分量有限但和上溢 Infinity（分量数量级过大）→ 归一化系数塌成 0、点静默落原点；fail-loud 不静默出怪图
    if (!Number.isFinite(sum)) {
      throw new Error(`lowerPlots: ternary coordinate components overflow when summed (got x=${x}, y=${y}, z=${z}); use proportions or smaller magnitudes`);
    }
    const nx = x / sum;
    const ny = y / sum;
    const nz = z / sum;
    return [nx * vx[0] + ny * vy[0] + nz * vz[0], nx * vx[1] + ny * vy[1] + nz * vz[1]];
  };
  return {
    type: PlotCoordinate.Ternary2D,
    roles: ['x', 'y', 'z'],
    vertices,
    project: () => null,
    projectRoles,
    projectCell: cell => ({ kind: 'contour', points: ternaryCellContour(cell, vertices) }),
  };
};

// ── 自定义坐标系（实验性；alpha.9 设计探讨产物）──────────────────────────────────────────
// 证明并落地：`projectRoles` 足以表达任意坐标系几何，无需「轴」抽象。投影函数（不可序列化）由运行时工厂
// 提供、不进 IR；IR 只留 `{type:'custom', name, roles, params}` 的 JSON 引用（见 ir/coordinate.ts）。
// 这是「一个通用扩展点」而非给枚举塞 exotic 成员——用户自定义曲线一维 / 拱形 x 轴等都走这条。

/** 自定义坐标帧：投影完全由工厂给出的 projectRoles 决定（任意几何） */
