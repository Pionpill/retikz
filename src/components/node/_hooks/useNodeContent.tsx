import { cloneElement, isValidElement, ReactElement, Ref, useMemo } from 'react';
import { ContentProps } from '../InnerNode';
import Text from '../../../elements/Text';

const useNodeContent = (props: ContentProps, ref: Ref<SVGElement>) => {
  const { color, size, children } = props;
  const isTextNode = children !== null && !isValidElement(children);
  return useMemo(
    () =>
      isTextNode ? (
        <Text fill={color} fontSize={size} ref={ref as Ref<SVGTextElement>}>
          {children}
        </Text>
      ) : isValidElement(children) ? (
        cloneElement(children as ReactElement<any>, { ref })
      ) : (
        children
      ),
    isTextNode ? [color, size, children] : [children],
  );
};

export default useNodeContent;
