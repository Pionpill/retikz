import type { IRTransform } from '../../schemas';
import type { PathCommand } from '../scene';

/** 内置 stroke Path 的最终所属者产物 */
export type StrokePathOwnerOutput = {
  /** Path 局部坐标系中的最终命令 */
  commands: Array<PathCommand>;
  /** 同一坐标系下的路径变换 */
  transforms: Array<IRTransform>;
};
