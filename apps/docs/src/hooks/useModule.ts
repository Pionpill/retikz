import { useLocation } from "react-router";

const useModule = () => {
  const { pathname} = useLocation();
  return pathname.split('/')[2];
}

export default useModule;