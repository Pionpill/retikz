import { forwardRef, PropsWithChildren, ReactNode, SVGProps, useMemo } from 'react';
import { textWrapParse } from '../utils/string';
import { FontProps } from '../types/svg/font';

type TextVerticalAlign = 'top' | 'center' | 'bottom';

export type DominantBaseline =
  | 'auto'
  | 'text-bottom'
  | 'alphabetic'
  | 'ideographic'
  | 'middle'
  | 'central'
  | 'mathematical'
  | 'hanging'
  | 'text-top';

export type TextProps = {
  x?: SVGProps<SVGTextElement>['x'];
  y?: SVGProps<SVGTextElement>['y'];
  align?: 'start' | 'middle' | 'end' | 'inherit';
  verticalAlign?: TextVerticalAlign | DominantBaseline;
  fontSize?: SVGProps<SVGTextElement>['fontSize'];
  fill?: SVGProps<SVGTextElement>['fill'];
} & FontProps &
  SVGProps<SVGTextElement>;

/**
 * 文本节点
 * @tikz node
 */
const Text = forwardRef<SVGTextElement, PropsWithChildren<TextProps>>((props, ref) => {
  const { children, align, verticalAlign, fontSize, fill, ...otherProps } = props;

  const dominantBaseline = useMemo(() => {
    switch (verticalAlign) {
      case 'top':
        return 'text-top';
      case 'bottom':
        return 'text-bottom';
      case 'center':
        return 'central';
      default:
        return verticalAlign;
    }
  }, [verticalAlign]);

  const textProps = {
    textAnchor: align || 'middle',
    dominantBaseline: dominantBaseline || 'central',
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
});

export default Text;
