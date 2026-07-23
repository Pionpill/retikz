import type { FC } from 'react';

import { Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib';

import type { PreviewControlValue, PreviewRangeControlField, PreviewStateControlField } from '../types';

import { PreviewPointControlInput } from './PreviewPointControlInput';

/** 判断运行时值是否是有限二维坐标 */
const isPreviewControlPoint = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every(coordinate => Number.isFinite(coordinate));

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

/** 在非 Dialog 预览中释放 Radix Select 对文档滚动的锁定 */
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

/** 单个声明式预览字段的渲染属性 */
export type PreviewControlFieldInputProps = {
  /** 字段定义 */
  field: PreviewStateControlField;
  /** 当前字段值 */
  value: PreviewControlValue;
  /** 是否使用适合浮层工具栏的紧凑尺寸
   * @default false
   */
  compact?: boolean;
  /** 字段值变化回调 */
  onValueChange: (value: PreviewControlValue) => void;
  /** 当前正在播放的范围控件 id */
  playingRangeId?: string;
  /** 开始播放范围控件 */
  onRangePlaybackStart?: (field: PreviewRangeControlField) => void;
  /** 停止范围控件播放 */
  onRangePlaybackStop?: () => void;
};

/** 用 shadcn 基础组件渲染单个声明式预览字段 */
export const PreviewControlFieldInput: FC<PreviewControlFieldInputProps> = props => {
  const {
    field,
    value,
    compact = false,
    onValueChange,
    playingRangeId,
    onRangePlaybackStart,
    onRangePlaybackStop,
  } = props;
  const { t } = useTranslation();
  const [selectOpen, setSelectOpen] = useState(false);
  useReleaseSelectDocumentLock(selectOpen);

  switch (field.kind) {
    case 'text':
      if (field.multiline === true) {
        return (
          <textarea
            data-slot="textarea"
            aria-label={field.label}
            value={typeof value === 'string' ? value : field.defaultValue}
            placeholder={field.placeholder}
            rows={compact ? 2 : 3}
            className={cn(
              'flex min-h-16 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
              compact && 'min-h-12 px-2 py-1 text-xs',
            )}
            onChange={event => onValueChange(event.currentTarget.value)}
          />
        );
      }
      return (
        <Input
          type="text"
          aria-label={field.label}
          value={typeof value === 'string' ? value : field.defaultValue}
          placeholder={field.placeholder}
          className={cn(compact && 'h-7 w-full px-2 text-xs')}
          onChange={event => onValueChange(event.currentTarget.value)}
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          aria-label={field.label}
          value={typeof value === 'number' ? value : field.defaultValue}
          min={field.min}
          max={field.max}
          step={field.step}
          className={cn(compact && 'h-7 w-full px-2 text-xs')}
          onChange={event => {
            const nextValue = event.currentTarget.valueAsNumber;
            if (Number.isFinite(nextValue)) onValueChange(nextValue);
          }}
        />
      );
    case 'select': {
      const selected = field.options.find(option => option.value === value);
      return (
        <Select
          value={typeof value === 'string' ? value : field.defaultValue}
          onOpenChange={open => {
            setSelectOpen(open);
            if (open) releaseSelectDocumentLock();
          }}
          onValueChange={nextValue => onValueChange(nextValue)}
        >
          <SelectTrigger aria-label={field.label} size={compact ? 'sm' : 'default'} className={cn('w-full min-w-0')}>
            <SelectValue>{selected?.label ?? String(value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {field.options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case 'switch':
      return (
        <Switch
          aria-label={field.label}
          checked={Boolean(value)}
          size={compact ? 'sm' : 'default'}
          onCheckedChange={checked => onValueChange(checked)}
        />
      );
    case 'color': {
      const colorValue = typeof value === 'string' ? value : field.defaultValue;
      return (
        <div className={cn('flex w-full min-w-0 items-center gap-2', compact && 'gap-1.5')}>
          <Input
            type="color"
            aria-label={`${field.label} picker`}
            value={colorValue}
            className={cn('h-9 w-12 shrink-0 p-1', compact && 'h-7 w-8')}
            onChange={event => onValueChange(event.currentTarget.value)}
          />
          <Input
            type="text"
            aria-label={field.label}
            value={colorValue}
            className={cn('min-w-0 font-mono', compact && 'h-7 w-full px-1 text-xs')}
            onChange={event => onValueChange(event.currentTarget.value)}
          />
        </div>
      );
    }
    case 'range': {
      const rangeValue = typeof value === 'number' ? value : field.defaultValue;
      const playing = playingRangeId === field.id;
      const playbackLabel = t(playing ? 'preview.pauseRange' : 'preview.playRange');
      return (
        <div className={cn('flex w-full min-w-0 items-center gap-3', compact && 'gap-2')}>
          <Slider
            aria-label={field.label}
            value={[rangeValue]}
            min={field.min}
            max={field.max}
            step={field.step}
            onValueChange={nextValues => {
              onRangePlaybackStop?.();
              onValueChange(nextValues[0]);
            }}
          />
          <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{rangeValue}</span>
          <Button
            type="button"
            variant="ghost"
            size={compact ? 'icon-xs' : 'icon-sm'}
            aria-label={playbackLabel}
            title={playbackLabel}
            disabled={onRangePlaybackStart === undefined || field.min >= field.max}
            onClick={() => {
              if (playing) onRangePlaybackStop?.();
              else onRangePlaybackStart?.(field);
            }}
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          </Button>
        </div>
      );
    }
    case 'point': {
      const pointValue = isPreviewControlPoint(value)
        ? value
        : ([field.defaultValue[0], field.defaultValue[1]] satisfies [number, number]);
      return (
        <PreviewPointControlInput field={field} value={pointValue} compact={compact} onValueChange={onValueChange} />
      );
    }
    default: {
      const exhaustiveField: never = field;
      return exhaustiveField;
    }
  }
};
