import { createBrowserRouter } from 'react-router';

import { App } from './App';
import { createBenchRoutes } from './routes';

/** 创建 Bench Playground 浏览器路由器 */
export const createBenchBrowserRouter = (): ReturnType<typeof createBrowserRouter> =>
  createBrowserRouter(createBenchRoutes(module => <App key={module.id} module={module} />));
