import { forwardRef, PropsWithChildren } from 'react';
import { ScopeContext, ScopeProps as ScopeContextProps } from '../hooks/context/useScope';
import Group, { GroupProps } from '../container/Group';

export type ScopeProps = ScopeContextProps & Omit<GroupProps, 'offset'>;

const Scope = forwardRef<SVGGElement, PropsWithChildren<ScopeProps>>((props, ref) => {
  const { children, ...resProps } = props;

  return (
    <ScopeContext.Provider value={resProps}>
      <Group ref={ref}>{children}</Group>
    </ScopeContext.Provider>
  );
});

export default Scope;
