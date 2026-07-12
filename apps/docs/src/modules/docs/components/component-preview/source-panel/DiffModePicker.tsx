import type { FC } from 'react';

import { Ban, Diff, Minus, Plus } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import type { DiffMode } from '../types';

/** Diff 模式选择器属性。 */
export type DiffModePickerProps = {
  /** 当前 diff 模式。 */
  mode: DiffMode;
  /** 切换 diff 模式。 */
  onModeChange: (mode: DiffMode) => void;
};

/** 源码面板的 diff 模式选择器。 */
export const DiffModePicker: FC<DiffModePickerProps> = props => {
  const { mode, onModeChange } = props;

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={mode}
      onValueChange={value => {
        if (value === 'off' || value === 'added' || value === 'removed' || value === 'full') {
          onModeChange(value);
        }
      }}
      className="mr-1"
    >
      <ToggleGroupItem value="off" aria-label="Diff off" title="Off" className="h-7 min-w-7 cursor-pointer px-1.5">
        <Ban className="size-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="added"
        aria-label="Added only"
        title="Added only"
        className="h-7 min-w-7 cursor-pointer px-1.5"
      >
        <Plus className="size-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="removed"
        aria-label="Removed only"
        title="Removed only"
        className="h-7 min-w-7 cursor-pointer px-1.5"
      >
        <Minus className="size-3.5" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="full"
        aria-label="Full diff"
        title="Full diff"
        className="h-7 min-w-7 cursor-pointer px-1.5"
      >
        <Diff className="size-3.5" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
