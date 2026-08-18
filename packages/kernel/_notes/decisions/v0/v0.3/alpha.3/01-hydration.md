# ADR-01：SVG 与 Canvas 统一 hydration 事件语义

- 状态：Accepted（已实现）
- 决策日期：2026-06-04
- 关联：[alpha.1 ADR-03 Vanilla runtime](../alpha.1/03-vanilla-runtime-and-dependency-graph.md)

## 背景

SSR/静态输出需要在客户端把 handler 绑定回图元。SVG 有 DOM 图元，Canvas 没有逐图元 DOM，但两者仍应具有相同的事件语义；handler 不能进入可持久化 IR。Path 原先没有 user id，且 Node 可能平铺输出多个图元，不能假定每个元素都有单一 group 或单一 primitive。

## 决策

水合 runtime 位于 renderer 共享层，分为统一分发和后端定位两层：

- 上层维护 Map<id, Map<eventName, handler>>，每个 root 使用常数个委托 listener；命中 id 后调用对应 handler
- SVG 通过 event.target.closest('[data-retikz-id]') 定位；Canvas 将 pointer 转为 Scene 坐标，按逆 z-order 复用绘制几何与 isPointInPath/isPointInStroke 做 hit-test，并返回最近的 id-bearing 祖先
- 非冒泡的 pointerEnter/pointerLeave 用 pointermove 和上一帧命中 id 的状态机合成：id 变化时先 leave 旧值，再 enter 新值。DOM 技术名不外露
- user id 是 opt-in 挂点。compile 将它 stamp 到每个 top-level emit 图元的 ScenePrimitive.id?；纯几何 Node 的多个 shape 共享同一 id，文本/rotate Node 使用其 GroupPrim，Path 使用 PathPrim，Scope 使用 GroupPrim。Coordinate 不产生可命中的图元
- Path schema 新增可选 IRPath.id。事件名使用完整字面量（包括 doubleClick、rightClick），以 const object 派生类型；handler 是 runtime 闭包，永不进入 IR

SVG 的 data-retikz-id 只负责定位。Canvas 不伪造 DOM 节点，两端共享注册表、事件命名和 handler 调用语义。

## 兼容性与实现结果

Path id、Scene primitive id、事件 props、Vanilla hydrate/mountCanvas 和 React 双 renderer 接线已完成；原有无 handler 图和既有 handler 用法保持兼容。未注册 handler 或没有命中目标时不调用回调，其他图元继续工作。

## 遗留风险

键盘/焦点、拖拽编排、touch 专属事件、超大图空间索引、离屏拾取、interaction manifest 和 progressive update 未纳入本 ADR；未来扩展必须继续保持 handler 不进 IR 和 SVG/Canvas 统一语义。
