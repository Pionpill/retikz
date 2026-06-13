import type { FC } from 'react';

import { cn } from '@/lib/utils';

import { ToolbarIconButton } from './_parts';
import type { PreviewAction, PreviewActionContext } from './_shared';

export type PreviewActionBarProps = {
  /** 要渲染的动作（内置工具 + 自定义 actions 合并后） */
  actions: Array<PreviewAction>;
  /** 共享上下文（replay / renderPane / toolState 等） */
  ctx: PreviewActionContext;
  /**
   * 强制可见（移动端无 hover，由父级 tap 切 pinned）；省略时沿用 hover/focus 显隐
   * @description 与 PanZoomToolbar 同套显隐规则；位于渲染区左上角，与右下角的 PanZoomToolbar 不相撞
   */
  pinned?: boolean;
  /** 始终可见（如放大 Dialog 内，无 group hover 容器） */
  alwaysVisible?: boolean;
};

/** 渲染区左上角工具栏：渲染传入的 actions（无 actions 时不渲染） */
export const PreviewActionBar: FC<PreviewActionBarProps> = props => {
  const { actions, ctx, pinned, alwaysVisible } = props;
  if (actions.length === 0) return null;
  return (
    <div
      className={cn(
        'absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur',
        alwaysVisible
          ? ''
          : pinned
            ? 'opacity-100'
            : 'pointer-events-none opacity-0 transition-opacity group-hover/preview:pointer-events-auto group-hover/preview:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100',
      )}
      // 工具栏自身不触发卡片的 tap-to-pin / drag
      onClick={event => event.stopPropagation()}
      onMouseDown={event => event.stopPropagation()}
      onTouchStart={event => event.stopPropagation()}
    >
      {actions.map(action => (
        <ToolbarIconButton
          key={action.id}
          label={action.label}
          title={action.label}
          pressed={action.active}
          onClick={() => action.onClick(ctx)}
        >
          {action.icon}
        </ToolbarIconButton>
      ))}
    </div>
  );
};
