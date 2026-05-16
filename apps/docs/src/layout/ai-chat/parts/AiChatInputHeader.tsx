import { type FC } from 'react';

import { AiChatInputContextChips } from './AiChatInputContextChips';
import { AiChatInputDetailPopover } from './AiChatInputDetailPopover';
import { AiChatInputSettingsPopover } from './AiChatInputSettingsPopover';

/**
 * Input 顶部 detached header（在 card 外、无 border、与外层 bg 同色）
 * @description 左侧 chips 列表（max 2 行、超出 y 滚动、滚动条隐藏）；右侧 Detail / Settings 两个 icon 按钮
 */
export const AiChatInputHeader: FC = () => (
  <div className="flex items-center gap-2">
    <div className="flex flex-1 flex-wrap items-center gap-1.5 overflow-y-auto" style={{ maxHeight: 44 }}>
      <AiChatInputContextChips />
    </div>
    <div className="flex shrink-0 items-center gap-0.5">
      <AiChatInputDetailPopover />
      <AiChatInputSettingsPopover />
    </div>
  </div>
);
