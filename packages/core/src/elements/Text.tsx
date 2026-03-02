import type { PropsWithChildren, ReactNode, SVGProps } from 'react';
import { forwardRef, useMemo } from 'react';
import { textWrapParse } from '../utils/string';
import type { FontProps } from '../types/svg/font';

type TextVerticalAlign = 'top' | 'center' | 'bottom';

export type DominantBaseline = Exclude<SVGProps<SVGTextElement>['dominantBaseline'], undefined>;

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
        return 'text-before-edge';
      case 'bottom':
        return 'text-after-edge';
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

  const parseChildren = (content: ReactNode) => {
    if (typeof content === 'string') {
      return textWrapParse(content).map((child, index) => <tspan key={index}>{child}</tspan>);
    }
    return content;
  };

  return (
    <text ref={ref} {...textProps}>
      {parseChildren(children)}
    </text>
  );
});

export default Text;
