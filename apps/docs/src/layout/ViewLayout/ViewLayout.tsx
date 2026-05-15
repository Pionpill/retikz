import type { FC } from 'react';
import { Outlet } from 'react-router';

import { AiChatPanel } from '@/layout/ai-chat';

import AppHeader from '../header/AppHeader';

/**
 * 根布局：Header + Routes content 同列，AI Panel 作为整个视图的右兄弟
 * @description 左栏（flex-col）从上到下：AppHeader + Outlet（DocLayout）；右栏：AiChatPanel，
 *   打开时挤压左栏（包括 Header）、关闭时 w-0。Header 不再放 App.tsx，避免 AI Panel 抢不到与 Header 同高的位置。
 */
export const ViewLayout: FC = () => (
  <div className="flex min-h-screen">
    <div className="flex min-w-0 flex-1 flex-col">
      <AppHeader />
      <Outlet />
    </div>
    <AiChatPanel />
  </div>
);
