import type { IRNode } from '@retikz/core';

import { BLOCK_TEXT_LAYOUT, BLOCK_TEXT_STYLES } from './defaults';
import { mergeBlockProperties } from './properties';
import type { BlockTextOptions } from './types';

/** 在原 Core 字段粒度合并角色默认，不持久化独立文字模型 */
const composeText = (options: BlockTextOptions, defaults: NonNullable<IRNode['style']>): IRNode => ({
  ...mergeBlockProperties<BlockTextOptions>({ text: options.text }, options),
  type: 'node',
  style: {
    ...mergeBlockProperties(defaults, options.style),
    font: mergeBlockProperties<NonNullable<NonNullable<IRNode['style']>['font']>>(
      defaults.font ?? {},
      options.style?.font,
    ),
  },
  layout: mergeBlockProperties<NonNullable<IRNode['layout']>>(BLOCK_TEXT_LAYOUT, options.layout),
});

/** 以普通 Node 提供 base/bold 标题角色 */
export const composeBlockTitle = (options: BlockTextOptions): IRNode => composeText(options, BLOCK_TEXT_STYLES.title);

/** 以普通 Node 提供 xs 与 0.7 opacity 的说明角色 */
export const composeBlockDescription = (options: BlockTextOptions): IRNode =>
  composeText(options, BLOCK_TEXT_STYLES.description);
