import type { InputStepLabel } from '@retikz/vanilla';
import type { FC } from 'react';

import { TIKZ_EDGE_LABEL } from '../../kernel/protocol';

export type EdgeLabelProps = {
  /** 段上位置（TikZ `midway` / `near start` / `near end`），缺省 'midway' */
  position?: InputStepLabel['position'];
  /** 相对段方向 / 视觉方位的偏移侧，缺省 'top' */
  side?: InputStepLabel['side'];
  /** 是否沿采样点切线旋转标签 */
  sloped?: InputStepLabel['sloped'];
  /** 是否请求在兼容的 Stroke 宿主上断开描边 */
  interrupt?: InputStepLabel['interrupt'];
  /** 标签文字内容；必须是字符串 */
  children: string;
};

/**
 * Sugar 组件——挂在 <Step> 内作为子节点声明边标注
 * @description 等价于在 Step 上写 `label={{ text, position, side, interrupt }}` prop；二者并存时 prop 优先。自身不渲染
 */
export const EdgeLabel: FC<EdgeLabelProps> = () => null;
EdgeLabel.displayName = TIKZ_EDGE_LABEL;
