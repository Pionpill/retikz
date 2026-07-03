import type { FC } from 'react';

import { useEffect, useState } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import type { PreviewAction, PreviewActionContext } from '../types';

import { ToolbarIconButton } from './parts';

const releaseSelectDocumentLock = (): void => {
  if (document.querySelector('[role="dialog"]')) return;
  document.body.style.pointerEvents = '';
  document.body.style.setProperty('overflow', 'visible', 'important');
  document.documentElement.style.setProperty('overflow', 'visible', 'important');
};

const restoreSelectDocumentLockOverride = (): void => {
  document.body.style.removeProperty('overflow');
  document.documentElement.style.removeProperty('overflow');
};

const useReleaseSelectDocumentLock = (open: boolean): void => {
  useEffect(() => {
    if (!open) return undefined;
    let frame = 0;
    const tick = () => {
      releaseSelectDocumentLock();
      frame = window.requestAnimationFrame(tick);
    };
    tick();
    return () => {
      window.cancelAnimationFrame(frame);
      window.requestAnimationFrame(restoreSelectDocumentLockOverride);
    };
  }, [open]);
};

const PreviewSelectActionControl: FC<{
  action: Extract<PreviewAction, { type: 'select' }>;
  ctx: PreviewActionContext;
}> = ({ action, ctx }) => {
  const [open, setOpen] = useState(false);
  useReleaseSelectDocumentLock(open);
  const value = ctx.actionValue(action.id) ?? action.value;
  const selected = action.options.find(option => option.value === value);
  return (
    <Select
      value={value}
      onOpenChange={nextOpen => {
        setOpen(nextOpen);
        if (nextOpen) releaseSelectDocumentLock();
      }}
      onValueChange={nextValue => {
        ctx.setActionValue(action.id, nextValue);
        action.onValueChange?.(nextValue, ctx);
      }}
    >
      <SelectTrigger aria-label={action.label} title={action.label} className="h-7 min-w-28 bg-background px-2 text-xs">
        <SelectValue>{selected?.label ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {action.options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export type PreviewActionBarProps = {
  /** 要渲染的动作；内置工具和自定义 actions 合并后传入。 */
  actions: Array<PreviewAction>;
  /** 共享上下文，提供 replay、renderPane、toolState 等能力。 */
  ctx: PreviewActionContext;
  /** 强制显示；移动端无 hover 时由父级 tap 切换 pinned。 */
  pinned?: boolean;
  /** 始终显示动作栏。 */
  alwaysVisible?: boolean;
};

/** 渲染区左上角动作栏。 */
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
      onClick={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
      onMouseDown={event => event.stopPropagation()}
      onTouchStart={event => event.stopPropagation()}
    >
      {actions.map(action =>
        action.type === 'select' ? (
          <PreviewSelectActionControl key={action.id} action={action} ctx={ctx} />
        ) : (
          <ToolbarIconButton
            key={action.id}
            label={action.label}
            title={action.label}
            pressed={action.active}
            onClick={() => action.onClick(ctx)}
          >
            {action.icon}
          </ToolbarIconButton>
        ),
      )}
    </div>
  );
};
