import { forwardRef, PropsWithChildren } from 'react';
import useScope, { ScopeContext, ScopeProps as ScopeContextProps } from '../hooks/context/useScope';
import Group, { GroupProps } from '../container/Group';

export type ScopeProps = ScopeContextProps & Omit<GroupProps, 'offset'>;

const Scope = forwardRef<SVGGElement, PropsWithChildren<ScopeProps>>((props, ref) => {
  const { children, ...resProps } = props;
  const baseScopeValue = useScope();

  return (
    <ScopeContext.Provider value={{...baseScopeValue, ...resProps}}>
      <Group ref={ref}>{children}</Group>
    </ScopeContext.Provider>
  );
});

export default Scope;
