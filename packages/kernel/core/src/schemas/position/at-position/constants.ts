import { WebAnchor } from '../../../shared';

/**
 * 节点相对方向 8 方向常量（Web canonical）
 * @description top/bottom=y 减/增（视觉上/下）；left/right=x 减/增；4 对角分量 1/√2 让对角距离与 distance 等长。
 *   compass（north / south-west）和旧 positioning（above / below-left）写法作为输入别名归一到这里。
 */
export const AtDirection = WebAnchor;
