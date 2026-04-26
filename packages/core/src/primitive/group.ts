import type { ScenePrimitive } from './scene';

/** 编组：把若干 primitive 用 transform 包起来 */
export type GroupPrim = {
  /** 类型判别符 */
  type: 'group';
  /** SVG transform 字符串（translate / rotate / scale 等） */
  transform?: string;
  /** 组内子原语 */
  children: Array<ScenePrimitive>;
};
