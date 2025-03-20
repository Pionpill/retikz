import { useReducer } from "react"

const useForceUpdate = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, forceUpdate] = useReducer(() => ({}), {});
  return forceUpdate;
}

export default useForceUpdate;