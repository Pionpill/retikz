import { useReducer } from 'react';

const useForceUpdate = () => {
  const [, forceUpdate] = useReducer(() => ({}), {});
  return forceUpdate;
};

export default useForceUpdate;
