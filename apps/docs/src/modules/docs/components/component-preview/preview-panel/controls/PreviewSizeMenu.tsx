import { Monitor, Smartphone, Tablet } from 'lucide-react';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';

import {
  Menubar,
  MenubarContent,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarTrigger,
} from '@/components/ui/menubar';
import type { Lang } from '@/i18n';

import { SIZE_KEYS, sizeClass } from '../../constants';
import type { SizeKey } from '../../types';

/** Showcase 独立尺寸菜单的状态与操作 */
export type PreviewSizeMenuProps = {
  /** 界面语言 */
  lang: Lang;
  /** 当前高度档位 */
  size: SizeKey;
  /** 更新高度 */
  onSizeChange: (size: SizeKey) => void;
  /** 宽度上限，0 为全宽 */
  width: number;
  /** 更新宽度 */
  onWidthChange?: (width: number) => void;
};

/** 图标入口支持悬浮、点击与键盘操作，菜单展示尺寸选项 */
export const PreviewSizeMenu: FC<PreviewSizeMenuProps> = props => {
  const { lang, size, onSizeChange, width, onWidthChange } = props;
  const [menu, setMenu] = useState('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const keepOpen = () => clearTimeout(closeTimer.current);
  const closeSoon = () => {
    keepOpen();
    closeTimer.current = setTimeout(() => setMenu(''), 150);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const WidthIcon = width === 375 ? Smartphone : width === 768 ? Tablet : Monitor;
  const heightLabel = lang === 'zh' ? '预览高度' : 'Preview height';
  const widthLabel = lang === 'zh' ? '预览宽度' : 'Preview width';
  return (
    <Menubar value={menu} onValueChange={setMenu} className="h-auto gap-1 p-1" onPointerLeave={closeSoon}>
      <MenubarMenu value="height">
        <MenubarTrigger
          aria-label={heightLabel}
          className="h-7 min-w-7 justify-center px-1 text-xs uppercase"
          onPointerEnter={event => {
            if (event.pointerType === 'mouse') {
              keepOpen();
              setMenu('height');
            }
          }}
        >
          {size.toUpperCase()}
        </MenubarTrigger>
        <MenubarContent align="end" className="min-w-0 w-max" onPointerEnter={keepOpen} onPointerLeave={closeSoon}>
          <MenubarRadioGroup
            value={size}
            onValueChange={value => {
              const nextSize = SIZE_KEYS.find(key => key === value);
              if (nextSize) onSizeChange(nextSize);
            }}
          >
            {SIZE_KEYS.map(key => {
              const [baseHeight, wideHeight = baseHeight] = sizeClass[key]
                .split(' ')
                .map(token => Number(token.slice(token.lastIndexOf('-') + 1)) * 4);
              return (
                <MenubarRadioItem key={key} value={key}>
                  <span className="w-8">{key.toUpperCase()}</span>
                  <span className="text-muted-foreground tabular-nums sm:hidden">{baseHeight}px</span>
                  <span className="hidden text-muted-foreground tabular-nums sm:inline">{wideHeight}px</span>
                </MenubarRadioItem>
              );
            })}
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>
      {onWidthChange ? (
        <MenubarMenu value="width">
          <MenubarTrigger
            aria-label={widthLabel}
            className="size-7 justify-center p-0"
            onPointerEnter={event => {
              if (event.pointerType === 'mouse') {
                keepOpen();
                setMenu('width');
              }
            }}
          >
            <WidthIcon className="size-3.5" />
          </MenubarTrigger>
          <MenubarContent align="end" className="min-w-0 w-max" onPointerEnter={keepOpen} onPointerLeave={closeSoon}>
            <MenubarRadioGroup value={String(width)} onValueChange={value => onWidthChange(Number(value))}>
              <MenubarRadioItem value="0">
                <Monitor />
                {lang === 'zh' ? '桌面 · 自适应' : 'Desktop · Auto'}
              </MenubarRadioItem>
              <MenubarRadioItem value="768">
                <Tablet />
                {lang === 'zh' ? '平板' : 'Tablet'} · 768px
              </MenubarRadioItem>
              <MenubarRadioItem value="375">
                <Smartphone />
                {lang === 'zh' ? '手机' : 'Mobile'} · 375px
              </MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
      ) : null}
    </Menubar>
  );
};
