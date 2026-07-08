import type { IRStepLabelInput } from '@retikz/core';
import type { FC } from 'react';

import { TIKZ_EDGE_LABEL } from '../../kernel/protocol';

export type EdgeLabelProps = {
  /** 段上位置（TikZ `midway` / `near start` / `near end`），缺省 'midway' */
  position?: IRStepLabelInput['position'];
  /** 相对段方向 / 视觉方位的偏移侧，缺省 'top' */
  side?: IRStepLabelInput['side'];
  /** 是否沿采样点切线旋转标签 */
  sloped?: IRStepLabelInput['sloped'];
  /** 标签文字内容；必须是字符串 */
  children: string;
};

/**
 * Sugar 组件——挂在 <Step> 内作为子节点声明边标注
 * @description 等价于在 Step 上写 `label={{ text, position, side }}` prop；二者并存时 prop 优先。自身不渲染。
 */
export const EdgeLabel: FC<EdgeLabelProps> = () => null;
EdgeLabel.displayName = TIKZ_EDGE_LABEL;
