import { RotateCcw, Table2 } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib';

import { PreviewControlFieldInput, resolveVisiblePreviewControlSections } from '../controls';
import type { PreviewControlsDefinition, PreviewControlState, PreviewControlContract } from '../types';
import { PreviewTableControl } from './PreviewTableControl';

/** 展示模式下常显的业务控件栏 */
export type PreviewControlBarProps = {
  /** 控件定义 */
  definition?: PreviewControlsDefinition;
  /** 共享的控件状态 */
  controlState: PreviewControlState;
  /** 可选的预设与基线契约 */
  controlContract?: PreviewControlContract;
};

/** 复用字段输入与条件显示，把控件排成可换行的底栏 */
export const PreviewControlBar: FC<PreviewControlBarProps> = props => {
  const { definition, controlState, controlContract } = props;
  const { t } = useTranslation();

  if (!definition) return null;
  const sections = resolveVisiblePreviewControlSections(
    definition.presentation === 'panel' ? definition.sections : [{ controls: definition.controls }],
    controlState.values,
  );
  return (
    <TooltipProvider delayDuration={250}>
      <div data-slot="preview-control-bar" className="flex flex-wrap items-center gap-2 py-3">
        {controlContract?.presets?.map(preset => (
          <Button
            key={preset.id}
            size="sm"
            variant="ghost"
            className="h-8 rounded-md bg-muted px-2.5 text-xs"
            onClick={() =>
              controlState.applyValues(
                preset.applyMode === 'merge-current' ? { ...controlState.values, ...preset.values } : preset.values,
              )
            }
          >
            {preset.label}
          </Button>
        ))}
        {sections
          .flatMap(section => section.controls)
          .map(field =>
            field.kind === 'table' ? (
              <Popover key={field.id}>
                <PopoverTrigger
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'ghost' }),
                    'h-8 rounded-md bg-muted px-2.5 text-xs',
                  )}
                >
                  <Table2 className="size-3.5" />
                  {field.label}
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  collisionPadding={4}
                  className="max-h-[min(24rem,var(--radix-popover-content-available-height))] w-[min(42rem,var(--radix-popover-content-available-width))] overflow-auto"
                >
                  <PreviewTableControl field={field} values={controlState.values} density="compact" />
                </PopoverContent>
              </Popover>
            ) : (
              <div
                key={field.id}
                data-control-id={field.id}
                className="flex min-h-8 max-w-full items-center gap-2 rounded-md bg-muted px-2.5 py-0.5 text-xs"
              >
                {field.kind === 'range' ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-pressed={controlState.rangePlaybackId === field.id}
                        disabled={controlState.startRangePlayback === undefined || field.min >= field.max}
                        className={cn(
                          'shrink-0 cursor-pointer rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50',
                          controlState.rangePlaybackId === field.id && 'text-primary',
                        )}
                        onClick={() => {
                          if (controlState.rangePlaybackId === field.id) controlState.stopRangePlayback?.();
                          else controlState.startRangePlayback?.(field);
                        }}
                      >
                        {field.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t(controlState.rangePlaybackId === field.id ? 'preview.stopRangeHint' : 'preview.playRangeHint')}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="shrink-0">{field.label}</span>
                )}
                <div className={field.kind === 'range' ? 'w-24' : field.kind === 'point' ? 'w-32' : 'min-w-0'}>
                  <PreviewControlFieldInput
                    field={field}
                    compact
                    showRangePlaybackButton={false}
                    value={controlState.values[field.id] ?? field.defaultValue}
                    onValueChange={value => controlState.setValue(field.id, value)}
                    playingRangeId={controlState.rangePlaybackId}
                    onRangePlaybackStart={controlState.startRangePlayback}
                    onRangePlaybackStop={controlState.stopRangePlayback}
                  />
                </div>
              </div>
            ),
          )}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t('preview.resetControls')}
          title={t('preview.resetControls')}
          onClick={controlState.reset}
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>
    </TooltipProvider>
  );
};
