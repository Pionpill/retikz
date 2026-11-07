import type { GroupPrimitive } from '../../../contract';
import type { IRPosition } from '../../../schemas';
import type { CompiledTextBlockLayout, TextLayoutContext } from '../../text';
import type { PathCompileContext } from '../types';

/** 路径标签的文字、定位和绘制共享能力 */
export type PathLabelContext = Pick<PathCompileContext, 'measureText' | 'round'> & {
  /** 与标签自身透明度合成的宿主透明度 */
  hostOpacity?: number;
  /** 公式降解与诊断能力 */
  tex?: Pick<TextLayoutContext, 'lowerTex' | 'warn'>;
  /** 宿主提供的侧向偏移，缺省使用标签自身距离 */
  placement?: { sideOffset?: number };
};

/** 路径标签排版及定位结果，不含绘制图元 */
export type CompiledPathLabelLayout = {
  /** 已排版的共享文本块 */
  block: CompiledTextBlockLayout;
  /** 旋转前的文本块左上角 */
  left: number;
  /** 旋转前的文本块顶边 */
  top: number;
  /** 图元需要应用的旋转 */
  transforms?: GroupPrimitive['transforms'];
  /** 旋转后的文本块边界，用于断线与输出范围计算 */
  boundsPoints: Array<IRPosition>;
};
