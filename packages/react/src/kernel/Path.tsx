import type { FC, ReactNode } from 'react';
import type { IRPath } from '@retikz/core';
import { TIKZ_PATH } from './_displayNames';

/** <Path> 组件的 props */
export type PathProps = {
  /** 描边色，省略时用 currentColor */
  stroke?: IRPath['stroke'];
  /** 描边宽度，省略时为 1 */
  strokeWidth?: IRPath['strokeWidth'];
  /** SVG stroke-dasharray 模式（如 "4 2"） */
  strokeDasharray?: IRPath['strokeDasharray'];
  /** 应当全部是 <Step /> */
  children: ReactNode;
};

/**
 * Path 容器——本身不渲染。children 扫描阶段读出其中的 <Step /> 构造 IRPath。
 */
export const Path: FC<PathProps> = () => null;
Path.displayName = TIKZ_PATH;
