import { create } from 'zustand';

import type { SourceLinkItem } from '@/modules/docs/source-viewer';

/** 右侧共享区域的当前内容。 */
export type RightPanel = { kind: 'none' } | { kind: 'ai' } | { kind: 'source'; source: SourceLinkItem };

type RightPanelStore = {
  panel: RightPanel;
  openAi: () => void;
  openSource: (source: SourceLinkItem) => void;
  close: () => void;
};

/** Docs 右侧共享面板状态，不保存源码或 AI 会话数据。 */
export const useRightPanelStore = create<RightPanelStore>(set => ({
  panel: { kind: 'none' },
  openAi: () => set({ panel: { kind: 'ai' } }),
  openSource: source => set({ panel: { kind: 'source', source } }),
  close: () => set({ panel: { kind: 'none' } }),
}));
