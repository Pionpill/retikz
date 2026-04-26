import type { PropsWithChildren, Ref, SVGProps } from 'react';
import { forwardRef } from 'react';

export type GroupProps = {
  ref?: Ref<SVGGElement>;
} & SVGProps<SVGGElement>;

const Group = forwardRef<SVGGElement, PropsWithChildren<SVGProps<SVGGElement>>>((props, ref) => {
  return <g ref={ref} {...props} />;
});

export default Group;
