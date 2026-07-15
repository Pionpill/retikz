import type { IRFont } from '@retikz/core';
import type { FC } from 'react';

import { TIKZ_TEXT } from '../protocol';

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
 * @description 声明一行节点文本；与字符串内容按 JSX 顺序合并，字段只覆盖当前这一行
 */
export const Text: FC<TextProps> = () => null;
Text.displayName = TIKZ_TEXT;
