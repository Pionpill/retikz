import type { FC, Ref } from 'react';

import type { LayoutProps } from '../Layout';

/** SVG 根元素的尺寸、样式与引用 */
export type SvgHostProps = Required<Pick<LayoutProps, 'width' | 'height'>> &
  Pick<LayoutProps, 'className' | 'style'> & {
    svgRef: Ref<SVGSVGElement>;
  };

/** React 持有 SVG 根元素，子节点由原生 renderer 管理 */
export const SvgHost: FC<SvgHostProps> = props => {
  const { svgRef, ...attributes } = props;
  return <svg ref={svgRef} {...attributes} />;
};
