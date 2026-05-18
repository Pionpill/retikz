import { type FC } from 'react';

import { AiChatInputContextChips } from './AiChatInputContextChips';
import { AiChatInputDetailPopover } from './AiChatInputDetailPopover';
import { AiChatInputSettingsPopover } from './AiChatInputSettingsPopover';

/**
 * Input 顶部 detached header（在 card 外、无 border、与外层 bg 同色）
 * @description 左侧 chips 列表（max 2 行、超出 y 滚动、滚动条隐藏）；右侧 Detail / Settings 两个 icon 按钮。
 *   chips 容器 py-px：给 chip 1px 边框留 1px breathing room，否则移动端 retina 屏会把顶/底边框压到 overflow
 *   裁剪边沿，看起来像被截了一点
 */
export const AiChatInputHeader: FC = () => (
  <div className="flex items-center gap-2">
    <div
      className="flex flex-1 flex-wrap items-center gap-1.5 overflow-y-auto py-px"
      style={{ maxHeight: 48 }}
    >
      <AiChatInputContextChips />
    </div>
    <div className="flex shrink-0 items-center gap-0.5">
      <AiChatInputDetailPopover />
      <AiChatInputSettingsPopover />
    </div>
  </div>
);
