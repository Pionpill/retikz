import type { IRPathBase } from '@retikz/core';
import type { RequireExactlyOne } from '@retikz/foundation';
import type { PathOptions, WayDSL } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import type { HydrationEventProps } from '../protocol';
import { TIKZ_PATH } from '../protocol';

/** 用步骤或路径简写声明路径，并设置样式、箭头与交互 */
export type PathProps = Omit<PathOptions, 'way' | 'children'> &
  HydrationEventProps &
  (
    | RequireExactlyOne<{
        /** 路径走向简写，与 JSX 子步骤二选一 */
        way: WayDSL;
        /** 按声明顺序收集的 Step 子元素 */
        children: Exclude<ReactNode, undefined>;
      }>
    | {
        /** 自定义路径定义直接提供几何，不传步骤来源 */
        kind: NonNullable<IRPathBase['kind']>;
        arrow?: IRPathBase['arrow'];
      }
  );

/**
 * Path 用一组 `<Step>` 声明路径
 * @description 本组件自身不渲染 DOM；最终路径由 `<Layout>` 根据 step 序列、样式、箭头和标记输出
 */
export const Path: FC<PathProps> = () => null;
Path.displayName = TIKZ_PATH;
