import { type FC } from 'react';

import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { isMac } from '@/lib';

type ShortcutModifierKey = 'mod' | 'alt' | 'shift';

/** 快捷键展示 token。 */
export type ShortcutKey = ShortcutModifierKey | (string & {});

/** Shortcut 组件参数。 */
export type ShortcutProps = {
  /** 要展示的一组按键。 */
  keys: ReadonlyArray<ShortcutKey>;
  className?: string;
};

const getShortcutLabel = (key: ShortcutKey): string => {
  if (isMac) {
    if (key === 'mod') return '⌘';
    if (key === 'alt') return '⌥';
    if (key === 'shift') return '⇧';
    return key;
  }
  if (key === 'mod') return 'Ctrl';
  if (key === 'alt') return 'Alt';
  if (key === 'shift') return 'Shift';
  return key;
};

/** 按当前 OS 展示一组快捷键。 */
export const Shortcut: FC<ShortcutProps> = ({ keys, className }) => (
  <KbdGroup className={className}>
    {keys.map((k, i) => (
      <Kbd key={`${k}-${i}`}>{getShortcutLabel(k)}</Kbd>
    ))}
  </KbdGroup>
);
