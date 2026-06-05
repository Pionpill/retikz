import type { FC } from 'react';
import type { IRFont } from '@retikz/core';
import { TIKZ_TEXT } from './_displayNames';

/** <Text> 组件的 props——Node 多行文本里给某一行带覆盖样式 */
export type TextProps = {
  /** 行内容（字符串或数字；数字按文本渲染） */
  children: string | number;
  /** 行级覆盖颜色；不填走 Node 块级默认 */
  fill?: string;
  /** 行级透明度 0~1；不填走 Node 块级默认 */
  opacity?: number;
  /** 行级字体覆盖；missing 字段继承 Node 的 `font` 块级值 */
  font?: IRFont;
};

/**
 * Text 是 Node 内的"行级"标记组件——本身不渲染
 * @description 由 buildIR 在扫描 Node children 时识别为 LineSpec；与字符串 children 平等参与（字符串按 `'\n'` 拆纯样式行，`<Text>` 一次贡献一行带样式行），保持 JSX 顺序
 */
export const Text: FC<TextProps> = () => null;
Text.displayName = TIKZ_TEXT;
