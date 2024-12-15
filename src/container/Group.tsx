import { FC, PropsWithChildren, Ref, SVGProps } from 'react';

export type GroupProps = {
  ref?: Ref<SVGGElement>;
} & SVGProps<SVGGElement>;

const Group: FC<PropsWithChildren<GroupProps>> = props => {
  return <g {...props} />;
};

export default Group;
