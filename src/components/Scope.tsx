import { FC, PropsWithChildren } from 'react';
import { ScopeContext, ScopeProps as ScopeContextProps } from '../hooks/context/useScope';
import Group, { GroupProps } from '../container/Group';

export type ScopeProps = ScopeContextProps & Omit<GroupProps, 'offset'>;

const Scope: FC<PropsWithChildren<ScopeProps>> = props => {
  const { children, ref, ...resProps } = props;

  return (
    <ScopeContext value={resProps}>
      <Group ref={ref}>{children}</Group>
    </ScopeContext>
  );
};

export default Scope;
