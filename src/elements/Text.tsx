import { FC, PropsWithChildren, ReactNode, Ref, SVGProps, useMemo } from 'react';
import { DominantBaseline } from '../types/svg.type';
import { textWrapParse } from '../utils/string.utils';

type TextVerticalAlign = 'top' | 'middle' | 'bottom';

export type TextProps = {
  x?: SVGProps<SVGTextElement>['x'];
  y?: SVGProps<SVGTextElement>['y'];
  align?: 'start' | 'middle' | 'end' | 'inherit';
  verticalAlign?: TextVerticalAlign | DominantBaseline;
  fontSize?: SVGProps<SVGTextElement>['fontSize'];
  fill?: SVGProps<SVGTextElement>['fill'];
  ref?: Ref<SVGTextElement>;
} & SVGProps<SVGTextElement>;

/**
 * 文本节点
 * @tikz node
 */
const Text: FC<PropsWithChildren<TextProps>> = props => {
  const { children, ref, align, verticalAlign, fontSize, fill, ...otherProps } = props;

  const dominantBaseline = useMemo(() => {
    switch (verticalAlign) {
      case 'top':
        return 'text-top';
      case 'bottom':
        return 'text-bottom';
      default:
        return verticalAlign;
    }
  }, [verticalAlign]);

  const textProps = {
    textAnchor: align || 'middle',
    dominantBaseline: dominantBaseline || 'middle',
    fontSize: fontSize || '1em',
    fill: fill || 'currentColor',
    ...otherProps,
  };

  const parseChildren = (children: ReactNode) => {
    if (typeof children === 'string') {
      return textWrapParse(children).map((child, index) => <tspan key={index}>{child}</tspan>);
    }
    return children;
  };

  return (
    <text ref={ref} {...textProps}>
      {parseChildren(children)}
    </text>
  );
};

export default Text;
