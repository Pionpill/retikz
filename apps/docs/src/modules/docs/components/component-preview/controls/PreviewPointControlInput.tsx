import type { FC } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib';

import type { PreviewControlPoint, PreviewPointControlField } from '../types';

/** 二维点控件属性 */
export type PreviewPointControlInputProps = {
  /** 二维点字段定义 */
  field: PreviewPointControlField;
  /** 当前坐标 */
  value: PreviewControlPoint;
  /** 是否使用紧凑尺寸
   * @default false
   */
  compact?: boolean;
  /** 坐标变化回调 */
  onValueChange: (value: PreviewControlPoint) => void;
};

/** 用并排的 x / y 数字输入框编辑 `[number, number]` 坐标 */
export const PreviewPointControlInput: FC<PreviewPointControlInputProps> = props => {
  const { field, value, compact = false, onValueChange } = props;

  return (
    <div
      data-slot="preview-point-control"
      className={cn(
        'grid w-full min-w-0 grid-cols-2 overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        compact && 'rounded-sm',
      )}
    >
      {(['x', 'y'] as const).map((axis, index) => (
        <div key={axis} className={cn('flex min-w-0 items-center', index === 1 && 'border-l border-input')}>
          <span aria-hidden="true" className="shrink-0 pl-2 text-xs font-medium text-muted-foreground">
            {axis}
          </span>
          <Input
            type="number"
            aria-label={`${field.label} ${axis}`}
            value={value[index]}
            min={field.min[index]}
            max={field.max[index]}
            step={field.step}
            className={cn(
              'h-8 min-w-0 rounded-none border-0 bg-transparent px-1.5 py-0 text-right font-mono text-xs shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent',
              compact && 'h-7 px-1',
            )}
            onChange={event => {
              const nextCoordinate = event.currentTarget.valueAsNumber;
              if (!Number.isFinite(nextCoordinate)) {
                return;
              }
              const nextPoint: PreviewControlPoint = [...value];
              nextPoint[index] = Math.min(field.max[index], Math.max(field.min[index], nextCoordinate));
              onValueChange(nextPoint);
            }}
          />
        </div>
      ))}
    </div>
  );
};
