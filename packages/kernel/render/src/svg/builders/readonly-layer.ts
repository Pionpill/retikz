import type { RenderReadonlyLayer } from '../../runtime';
import type { SvgNode } from '../types';

/** 把普通只读 Scene 图层包装为主图之后的不可交互 SVG 分组 */
export const buildSvgReadonlyLayer = (layer: RenderReadonlyLayer, children: ReadonlyArray<SvgNode>): SvgNode => ({
  tag: 'g',
  attrs: {
    'data-retikz-readonly-layer': layer.key,
    'pointer-events': 'none',
    'aria-hidden': 'true',
    transform: `matrix(${layer.transform.join(' ')})`,
  },
  children: [...children],
});
