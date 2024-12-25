import { useReducer } from "react"

const useForceUpdate = () => {
    const [_, forceUpdate] = useReducer(() => ({}), {});
    return forceUpdate;
}

export default useForceUpdate;