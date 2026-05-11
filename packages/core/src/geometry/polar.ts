import { type Position, point } from './point';

/*
 * 极坐标不直接参与几何计算——所有计算（intersection/bbox/boundaryPoint/Path 端点）都在笛卡尔下进行，
 * 遇 PolarPosition 必先 polar.toPosition 转笛卡尔。
 * 保留极坐标只为：(1) 用户输入便利；(2) IR 保留意图，对 TikZ 双向 codec / 编辑器 / AI 友好。
 * Scene 编译 (compile.ts resolvePosition) 统一折成笛卡尔，本文件只提供 polar ↔ cartesian 转换。
 */

/**
 * 极坐标点：相对 origin 的角度 + 半径偏移
 * @description IR 保留 polar 形态，Scene 编译时统一解析为笛卡尔；origin 可嵌套/节点 id/坐标，省略表示 [0,0]
 */
export type PolarPosition = {
  /** 极坐标原点：节点 id / 笛卡尔 / 嵌套极坐标；省略表示 [0,0] */
  origin?: string | Position | PolarPosition;
  /** 角度（度数，逆时针为正） */
  angle: number;
  /** 半径（非负） */
  radius: number;
};

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** 极坐标 ↔ 笛卡尔转换工具集（polar 不参与几何计算，参与时先 toPosition） */
export const polar = {
  /**
   * 极坐标 → 笛卡尔位置（递归处理 origin）
   * @description origin 为字符串（节点 id）时抛错——字符串解析依赖 Scene 编译器 nodeIndex
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
  /** 笛卡尔 → 极坐标（angle ∈ (-180,180]，origin 默认 [0,0]） */
  fromPosition: (p: Position): PolarPosition => ({
    angle: Math.atan2(p[1], p[0]) * RAD_TO_DEG,
    radius: Math.hypot(p[0], p[1]),
  }),
  /** 在原点附近按极坐标偏移，返回结果点的世界笛卡尔坐标 */
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
 * 跨坐标系两点相同判断（point.equalPolar 别名）
 * @description 极坐标先转笛卡尔再按 precision 四舍五入比较
 * @param precision 小数点后位数；默认 2
 */
  equal: (
    a: Position | PolarPosition,
    b: Position | PolarPosition,
    precision = 2,
  ): boolean => point.equalPolar(a, b, precision),
};
