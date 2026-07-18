import type { FC } from 'react';

import { ResizableHandle } from '@/components/ui/resizable';

/** 用 shadcn Resizable primitive 渲染无图标的短条拖拽把手 */
export const PreviewResizeHandle: FC = () => (
  <ResizableHandle
    data-slot="preview-resize-handle"
    className="before:pointer-events-none before:absolute before:top-1/2 before:left-1/2 before:z-10 before:h-8 before:w-1 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-border data-[panel-group-direction=vertical]:before:h-1 data-[panel-group-direction=vertical]:before:w-8"
  />
);
