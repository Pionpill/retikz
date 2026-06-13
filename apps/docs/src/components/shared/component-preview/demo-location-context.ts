import { createContext, useContext } from 'react';

/**
 * 当前正在渲染的那份 MDX 内容所属页面的 path segments
 * @description DocPage 的 `stableSource` / MdxContent 的已编译 `Content` 在路由切换时会"慢一拍"——
 *   旧内容仍挂着、而实时路由(`useDocLocation`)已指向新页。若 `ComponentPreview` 从实时路由取目录，
 *   旧内容里的 demo 名会被拼到新页目录下 → 短暂 "Demo not found"。
 *   这里把 segments 与"真正在屏幕上的那份内容"配对下发，让 `ComponentPreview` 据此解析 demo 路径，
 *   彻底消除这个失步窗口。Provider 缺省(非 DocPage 场景，如 InlineMdx)时为 null，ComponentPreview 回退到实时路由。
 */
export const DemoLocationContext = createContext<Array<string> | null>(null);

/** 读取 MDX 内容配对的 segments；不在 DemoLocationContext 内时返回 null */
export const useDemoSegments = (): Array<string> | null => useContext(DemoLocationContext);
