import type { ReactElement, Ref } from 'react';
import { isValidElement } from 'react';
import type { ContentProps } from '../InnerNode';
import Text from '../../../elements/Text';

const useNodeContent = (props: ContentProps, ref: Ref<SVGElement>) => {
  const { color, size, opacity, fontWeight, fontStyle, fontFamily, fontStretch, children } = props;
  const isTextNode = children !== null && !isValidElement(children);
  return isTextNode ? (
    <Text
      fill={color}
      fontSize={size}
      fillOpacity={opacity}
      fontWeight={fontWeight}
      fontStyle={fontStyle}
      fontFamily={fontFamily}
      fontStretch={fontStretch}
      ref={ref}
    >
      {children}
    </Text>
  ) : isValidElement(children) ? (
    <g ref={ref}>{children as ReactElement<any>}</g>
  ) : (
    children
  );
};

export default useNodeContent;
