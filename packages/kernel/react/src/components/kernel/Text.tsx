import type { IRLine, TextLineSchema } from '@retikz/core';
import type { FC, ReactElement } from 'react';
import type { output } from 'zod';

import { TIKZ_TEXT } from '../../protocol';

/** Node 内单行文字的内容与样式覆盖 */
export type TextProps = Pick<output<typeof TextLineSchema>, 'fill' | 'opacity' | 'font'> & {
  /** 行内容（字符串或数字；数字按文本渲染） */
  children: string | number;
};

/**
 * Text 是 Node 内的"行级"标记组件——本身不渲染
 * @description 声明一行节点文本；与字符串内容按 JSX 顺序合并，字段只覆盖当前这一行
 */
export const Text: FC<TextProps> = () => null;
Text.displayName = TIKZ_TEXT;

/** 将 <Text> 元素读取为一条节点文本行 */
export const textElementToLineSpec = (element: ReactElement): IRLine | undefined => {
  const props = element.props as TextProps;
  if (typeof props.children !== 'string' && typeof props.children !== 'number') return undefined;

  const text = String(props.children);
  if (props.fill === undefined && props.opacity === undefined && props.font === undefined) return text;

  return {
    text,
    ...(props.fill === undefined ? {} : { fill: props.fill }),
    ...(props.opacity === undefined ? {} : { opacity: props.opacity }),
    ...(props.font === undefined ? {} : { font: props.font }),
  };
};
