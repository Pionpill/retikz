import { forwardRef, PropsWithChildren, Ref, SVGProps } from 'react';

export type GroupProps = {
  ref?: Ref<SVGGElement>;
} & SVGProps<SVGGElement>;

const Group = forwardRef<SVGGElement, PropsWithChildren<SVGProps<SVGGElement>>>((props, ref) => {
  return <g ref={ref} {...props} />;
});

export default Group;
