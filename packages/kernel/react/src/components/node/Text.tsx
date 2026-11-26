import type { IRLine, TextLineSchema } from '@retikz/core';
import { pickDefined } from '@retikz/foundation';
import type { FC } from 'react';
import type { output } from 'zod';

import { KernelDisplayName } from '../../shared';

/** Node 内单行文字的内容与样式覆盖 */
export type TextProps = Pick<output<typeof TextLineSchema>, 'fill' | 'opacity' | 'font'> & {
  /** 行内容（字符串或数字；数字按文本渲染） */
  children: string | number;
};

/**
 * 节点文本行
 * @description 在节点内声明一行文字，可单独设置行样式
 */
export const Text: FC<TextProps> = () => null;
Text.displayName = KernelDisplayName.Text;

/** 将 Text 声明的内容与样式转换为节点文本行 */
export const convertTextProps = (props: TextProps): IRLine => {
  const text = String(props.children);
  if (props.fill === undefined && props.opacity === undefined && props.font === undefined) return text;

  return {
    text,
    ...pickDefined(props, ['fill', 'opacity', 'font']),
  };
};
