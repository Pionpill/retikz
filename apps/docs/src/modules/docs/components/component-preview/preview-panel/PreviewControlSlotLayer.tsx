import type { FC } from 'react';

import { useMemo } from 'react';

import { cn } from '@/lib';

import type { PreviewControlPlacement, PreviewControlRuntime, PreviewControlSlot } from '../types';

const DEFAULT_PLACEMENT: PreviewControlPlacement = 'top-start';

const PLACEMENT_CLASS: Record<PreviewControlPlacement, string> = {
  'top-start': 'left-2 top-2',
  'top-center': 'left-1/2 top-2 -translate-x-1/2',
  'top-end': 'right-2 top-2',
  'center-start': 'left-2 top-1/2 -translate-y-1/2',
  center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
  'center-end': 'right-2 top-1/2 -translate-y-1/2',
  'bottom-start': 'left-2 bottom-2',
  'bottom-center': 'left-1/2 bottom-2 -translate-x-1/2',
  'bottom-end': 'right-2 bottom-2',
};

export type PreviewControlSlotLayerProps = {
  /** 按定义顺序渲染的控制插槽。 */
  slots: Array<PreviewControlSlot>;
  /** 接收插槽定义求值的当前面板 runtime。 */
  runtime: PreviewControlRuntime;
  /** 是否固定显示控制层。 */
  pinned?: boolean;
};

/** 将预览控制插槽渲染到预览区九宫格位置。 */
export const PreviewControlSlotLayer: FC<PreviewControlSlotLayerProps> = props => {
  const { slots, runtime, pinned } = props;
  const groups = useMemo(() => {
    const next = new Map<PreviewControlPlacement, Array<PreviewControlSlot>>();
    for (const slot of slots) {
      const placement = slot.placement ?? DEFAULT_PLACEMENT;
      next.set(placement, [...(next.get(placement) ?? []), slot]);
    }
    return [...next.entries()];
  }, [slots]);

  return (
    <>
      {groups.map(([placement, group]) => (
        <div
          key={placement}
          className={cn('pointer-events-none absolute z-10 flex items-center gap-1', PLACEMENT_CLASS[placement])}
          onClick={event => event.stopPropagation()}
          onPointerDown={event => event.stopPropagation()}
          onMouseDown={event => event.stopPropagation()}
          onTouchStart={event => event.stopPropagation()}
        >
          {group.map(slot => (
            <div
              key={slot.id}
              className={cn(
                'transition-opacity',
                pinned || slot.visibility === 'always'
                  ? 'pointer-events-auto opacity-100'
                  : 'pointer-events-none opacity-0 group-hover/preview:pointer-events-auto group-hover/preview:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100',
              )}
            >
              {slot.render(runtime)}
            </div>
          ))}
        </div>
      ))}
    </>
  );
};
