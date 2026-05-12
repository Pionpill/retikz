import type { ScenePrimitive } from './scene';

/**
 * Group transform：结构化变换
 * @description 按数组顺序应用（与 SVG transform 多操作列表语义一致）；角度=度，缩放 y 缺省等比 x，rotate cx/cy 缺省绕原点
 */
export type Transform =
  | { kind: 'translate'; x: number; y: number }
  | { kind: 'rotate'; degrees: number; cx?: number; cy?: number }
  | { kind: 'scale'; x: number; y?: number };

/** 编组：把若干 primitive 用结构化 transforms 包起来 */
export type GroupPrim = {
  /** 类型判别符 */
  type: 'group';
  /** 结构化变换序列，按数组顺序应用；undefined / 空数组表示无变换 */
  transforms?: Array<Transform>;
  /** 组内子原语 */
  children: Array<ScenePrimitive>;
};
