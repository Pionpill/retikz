import type { PropsWithChildren } from 'react';
import { forwardRef } from 'react';
import type { ScopeProps as ScopeContextProps } from '../hooks/context/useScope';
import useScope, { ScopeContext } from '../hooks/context/useScope';
import type { GroupProps } from '../container/Group';
import Group from '../container/Group';

export type ScopeProps = ScopeContextProps & Omit<GroupProps, 'offset'>;

const Scope = forwardRef<SVGGElement, PropsWithChildren<ScopeProps>>((props, ref) => {
  const { children, ...resProps } = props;
  const baseScopeValue = useScope();

  return (
    <ScopeContext.Provider value={{ ...baseScopeValue, ...resProps }}>
      <Group ref={ref}>{children}</Group>
    </ScopeContext.Provider>
  );
});

export default Scope;
