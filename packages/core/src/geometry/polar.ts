import { type Position, point } from './point';

/*
 * 极坐标系在 retikz 中的角色：
 *
 * **不直接参与几何计算**——所有计算（intersection、bbox、boundaryPoint、Path 端点等）
 * 都在笛卡尔坐标系下进行；遇到 PolarPosition 必先调 `polar.toPosition` 转成笛卡尔再算。
 *
 * 极坐标存在的意义只有两个：
 * 1. 用户输入便利——"在 A 的 30° 距 50 处"比手算 cos/sin 自然
 * 2. 意图保留——IR 中保留 polar 形态，对 TikZ 双向 codec / 编辑器 / AI 生成径向图友好
 *
 * Scene 编译时（compile.ts 的 resolvePosition）统一把 polar 折成笛卡尔，
 * 下游所有 renderer / 几何工具只看到笛卡尔——不会出现"在 polar 空间下做几何"这类操作。
 *
 * 本文件因此只提供 polar ↔ cartesian 的转换工具，不提供"在 polar 空间下计算"的运算。
 */

/**
 * 极坐标点：相对 origin 的角度 + 半径偏移。
 * - 可进 IR；Scene 编译时统一解析为笛卡尔
 * - 不直接参与几何计算，参与时先转为 Position（见本文件顶部说明）
 * - origin 可嵌套（PolarPosition），可引用节点 id（string），可直接给坐标（Position），省略表示原点 [0, 0]
 */
export type PolarPosition = {
  /** 极坐标原点：节点 id / 笛卡尔位置 / 嵌套极坐标；省略表示 [0, 0] */
  origin?: string | Position | PolarPosition;
  /** 角度（度数，逆时针为正，与 TikZ / 数学习惯一致） */
  angle: number;
  /** 半径（user units，应为非负） */
  radius: number;
};

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * 极坐标 ↔ 笛卡尔坐标 转换工具集。
 *
 * 注意 polar 不参与几何计算——参与计算时一律先用 `polar.toPosition` 转成 Position。
 * 详见本文件顶部的整体说明。
 */
export const polar = {
  /**
   * 极坐标 → 笛卡尔位置（递归处理 origin）。
   * **限制**：origin 为字符串（节点 id）时本方法无法解析，会抛错——
   * 字符串解析依赖 Scene 编译器的 nodeIndex 上下文。
   */
  toPosition: (p: PolarPosition): Position => {
    let origin: Position;
    if (!p.origin) {
      origin = [0, 0];
    } else if (typeof p.origin === 'string') {
      throw new Error(
        'polar.toPosition: cannot resolve string origin (node id) without node context; use the Scene compiler',
      );
    } else if (Array.isArray(p.origin)) {
      origin = p.origin;
    } else {
      origin = polar.toPosition(p.origin);
    }
    const rad = p.angle * DEG_TO_RAD;
    return [
      origin[0] + Math.cos(rad) * p.radius,
      origin[1] + Math.sin(rad) * p.radius,
    ];
  },
  /** 笛卡尔位置 → 极坐标（angle 落在 (-180, 180]，origin 取默认 [0, 0]） */
  fromPosition: (p: Position): PolarPosition => ({
    angle: Math.atan2(p[1], p[0]) * RAD_TO_DEG,
    radius: Math.hypot(p[0], p[1]),
  }),
  /** 在某个原点附近按极坐标偏移；返回结果点的世界笛卡尔坐标 */
  offsetFrom: (
    origin: Position,
    offset: { angle: number; radius: number },
  ): Position => {
    const rad = offset.angle * DEG_TO_RAD;
    return [
      origin[0] + Math.cos(rad) * offset.radius,
      origin[1] + Math.sin(rad) * offset.radius,
    ];
  },
  /**
   * 判断两个点是否相同（跨坐标系）。每个参数可以是笛卡尔 [x, y] 或 PolarPosition；
   * 极坐标先转为笛卡尔，再按 precision 指定的小数位数四舍五入比较。
   * 实际是 `point.equalPolar` 的别名（同一份实现，两处可发现）。
   * @param precision 小数点后位数；默认 2
   */
  equal: (
    a: Position | PolarPosition,
    b: Position | PolarPosition,
    precision = 2,
  ): boolean => point.equalPolar(a, b, precision),
};
