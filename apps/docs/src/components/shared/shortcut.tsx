import { type FC } from 'react';

import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { isMac } from '@/lib/platform';
import { cn } from '@/lib/utils';

/**
 * 标准化的修饰键 token：调用方传符号词 'mod' / 'alt' / 'shift' / 任意字面键，
 * 渲染时按当前 OS 翻成 Mac 字符（⌘ ⌥ ⇧）或 Windows 字面（Ctrl Alt Shift）。
 * - `mod` 是「主修饰键」：Mac 走 ⌘ / Cmd，其它平台走 Ctrl —— 与监听层 `metaKey ?? ctrlKey` 一致。
 */
type ShortcutKey = string;

const symbolFor = (key: ShortcutKey): string => {
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

/**
 * 渲染一组按 OS 翻译过的快捷键，每个键独立 `<Kbd>` 由 `<KbdGroup>` 横向拼接。
 * 用法：`<Shortcut keys={['mod', 'alt', 'B']} />` → Mac 显示 `⌘ ⌥ B`、Win 显示 `Ctrl Alt B`。
 */
export const Shortcut: FC<{ keys: ReadonlyArray<ShortcutKey>; className?: string }> = ({ keys, className }) => (
  <KbdGroup className={cn(className)}>
    {keys.map((k, i) => (
      <Kbd key={i}>{symbolFor(k)}</Kbd>
    ))}
  </KbdGroup>
);
