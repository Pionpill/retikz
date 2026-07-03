import { type FC } from 'react';

import { AiChatInputContextChips } from './AiChatInputContextChips';
import { AiChatInputDetailPopover } from './AiChatInputDetailPopover';
import { AiChatInputSettingsPopover } from './AiChatInputSettingsPopover';

/** AI 输入区顶部工具栏。 */
export const AiChatInputHeader: FC = () => (
  <div className="flex items-center gap-2">
    <div className="flex flex-1 flex-wrap items-center gap-1.5 overflow-y-auto py-px" style={{ maxHeight: 48 }}>
      <AiChatInputContextChips />
    </div>
    <div className="flex shrink-0 items-center gap-0.5">
      <AiChatInputDetailPopover />
      <AiChatInputSettingsPopover />
    </div>
  </div>
);
