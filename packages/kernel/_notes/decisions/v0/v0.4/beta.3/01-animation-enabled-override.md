# ADR-01：动画开关采用显式值覆盖系统偏好的三态语义

- 状态：Proposed
- 决策日期：2026-07-12
- 关联：[beta.3 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [v0.3 alpha.5 runtime control](../../v0.3/alpha.5/04-runtime-control.md) · [core-design.md](../../../../../../../notes/architecture/core-design.md)

## 背景

React 的 `<Layout animate>` 与 Vanilla 的 `animation.enabled` 都已允许作者关闭动画，但当前实现把“未传”与“显式传 `true`”合并处理：只要浏览器报告 `prefers-reduced-motion: reduce`，两者都会渲染静态终态。因此作者可以显式关闭，却无法为演示、教学或用户主动选择的场景显式开启。

这也使 API 的布尔值语义不完整：`false` 是强制关闭，`true` 却不是强制开启。系统偏好应当作为未指定配置时的默认来源，而不是覆盖调用方已经明确传入的值。

动画轨道、Scene 与静态降级语义已经由 core / render 定义完整。本问题只涉及宿主 runtime 如何把作者配置与浏览器偏好解析成最终布尔值，不需要把环境信息写进 IR，也不应让 `@retikz/core` 读取浏览器状态。

## 决策：保留两端现有命名，由 render 统一解析三态优先级

React 保留扁平 prop `animate`，Vanilla 保留运行时配置组 `animation.enabled`。两者共享同一语义：未传时跟随系统；显式 `true` 强制开启；显式 `false` 强制关闭。

```ts
export const resolveAnimationEnabled = (explicit: boolean | undefined, reducedMotion: boolean): boolean =>
  explicit ?? !reducedMotion;
```

`resolveAnimationEnabled` 放在 `@retikz/render/animation`，保持为接收已读取环境值的纯函数：React 传入可订阅的 `usePrefersReducedMotion()` 结果；Vanilla 在 mount / render 调用时传入 `prefersReducedMotion()` 结果。低层 SVG document builder 与 Canvas renderer 只消费解析后的布尔值，不自行读取媒体查询。

| 作者意图 | React             | Vanilla                         | 最终行为                           |
| -------- | ----------------- | ------------------------------- | ---------------------------------- |
| 跟随系统 | 省略 `animate`    | 省略 `animation.enabled`        | `reduce` 时关闭，否则开启          |
| 强制开启 | `animate={true}`  | `animation: { enabled: true }`  | 不受 `prefers-reduced-motion` 影响 |
| 强制关闭 | `animate={false}` | `animation: { enabled: false }` | 始终关闭                           |

`snapshotAt` 的优先级保持更高：只要提供静态截帧时刻，就渲染该时刻的静态帧，不启动动画，即使同时显式开启。无 `matchMedia` 的 SSR / 非浏览器环境按“系统未要求减少动态效果”处理，因此未传开关时默认开启；显式值仍保持确定性。

理由：

1. 布尔值恢复对称语义，显式作者配置高于隐式环境默认值。
2. React 与 Vanilla 共享解析规则，同时保留符合各自 API 结构的现有命名，避免无收益的破坏性重命名。
3. 环境读取停留在 adapter / runtime，core IR、Scene 和编译管线继续保持 renderer-agnostic。
4. CanvasHost 只接受 Layout 已解析的结果，避免同一条渲染路径重复读取系统偏好并覆盖显式 `true`。

## 待决策点 🔻

无。命名、优先级、共享 owner、SSR 默认值与 `snapshotAt` 优先级均在本 ADR 固定。

## DSL 表面

```tsx
// React：未传时跟随系统；显式 true / false 强制开关。
<Layout>{/* ... */}</Layout>
<Layout animate={true}>{/* ... */}</Layout>
<Layout animate={false}>{/* ... */}</Layout>
```

```ts
// Vanilla：语义相同，配置仍归入 animation 组。
mountSvg(container, spec);
mountSvg(container, spec, { animation: { enabled: true } });
mountSvg(container, spec, { animation: { enabled: false } });
```

显式 `true` 会覆盖用户的系统减少动态效果偏好。文档必须把它描述为作者主动选择的强制覆盖，只建议用于确实需要播放且用户能够理解或控制的场景。

## 测试设计

- `@retikz/render` 直接覆盖纯解析函数的三态真值表。
- `@retikz/react` 覆盖 SVG / Canvas、首次读取、媒体查询变化、显式值覆盖和 `snapshotAt`。
- `@retikz/vanilla` 覆盖 mountSvg / mountCanvas / renderToSvgString 的同义行为与无浏览器 API 降级。
- 保留低层 render builder 的纯配置测试，防止其重新读取宿主环境。

具体 case 拆分见下面“实现契约 § 测试象限”。

## 影响

- `@retikz/render/animation` 新增公开纯函数 `resolveAnimationEnabled`，供 React 与 Vanilla runtime 复用。
- `@retikz/react` 的 `LayoutProps.animate?: boolean` 类型和名称不变，但显式 `true` 在 reduced-motion 环境下由静态改为播放；CanvasHost 不再二次读取系统偏好。
- `@retikz/vanilla` 的 `VanillaAnimationOptions.enabled?: boolean` 类型和名称不变，但显式 `true` 同样覆盖 reduced-motion。
- `@retikz/core` 的 IR、Scene、schema、compile 与 animation track 契约均不改。
- 文档站同步 React / Vanilla 的三态映射、无障碍提示、`snapshotAt` 优先级和快速开始的显式演示用法。
- ⚠️ **行为变更**：此前在 reduced-motion 环境下，显式 `true` 仍为静态；迁移后它会强制播放。希望继续尊重系统偏好的调用方应省略该值，不要传 `true`。

## 不在本 ADR 范围

- 不新增 core IR 字段、Scene 字段或全局动画策略对象。
- 不统一 React 与 Vanilla 的属性形状，不把 React 改成 `animation={{ enabled }}`，也不把 Vanilla 改成顶层 `animate`。
- 不新增浏览器站点级偏好存储、文档站全局动画设置或持久化用户设置。
- 不让 Vanilla 已挂载 view 订阅系统偏好变化；Vanilla 继续在 mount / render 调用时解析一次，动态订阅需另行设计生命周期。
- 不改变不支持 CSS / WAAPI / rAF 时既有的静态降级策略。

---

## 实现契约（必填）🔻

### Level

`red`

本 ADR 自评 level：`red`。虽然不改 schema，但会改变 React / Vanilla 公开 API 的运行时语义，并在 `@retikz/render/animation` 增加公开能力，按公共契约变更取最高级。

### Schema 改动

无。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/kernel/render/src/animation/runtime.ts`（修改：新增纯解析函数）
- `packages/kernel/render/tests/animation/animation-runtime.test.ts`（修改：三态真值表与无环境边界）
- `packages/kernel/react/src/kernel/runtime/Layout.tsx`（修改：解析三态并完善 JSDoc）
- `packages/kernel/react/src/render/canvas/CanvasHost.tsx`（修改：只消费已解析布尔值）
- `packages/kernel/react/tests/kernel/runtime/reduced-motion.test.tsx`（修改：媒体偏好与显式覆盖）
- `packages/kernel/react/tests/kernel/runtime/animation.test.tsx`（修改：SVG / Canvas 与截帧交互）
- `packages/kernel/vanilla/src/runtime/types.ts`（修改：完善三态 JSDoc）
- `packages/kernel/vanilla/src/runtime/mount-svg.ts`（修改：使用共享解析函数）
- `packages/kernel/vanilla/src/runtime/mount-canvas.ts`（修改：使用共享解析函数）
- `packages/kernel/vanilla/src/runtime/render-svg.ts`（修改：SSR / 浏览器调用使用相同语义）
- `packages/kernel/vanilla/tests/runtime/animation.test.ts`（修改：SVG / Canvas 三态语义）
- `packages/kernel/vanilla/tests/runtime/render-svg.test.ts`（修改：SSR 与显式值）
- `apps/docs/src/modules/docs/contents/kernel/components/effects/animation/index.zh.mdx`（修改）
- `apps/docs/src/modules/docs/contents/kernel/components/effects/animation/index.en.mdx`（修改）
- `apps/docs/src/modules/docs/contents/kernel/components/layout/overview/index.zh.mdx`（修改）
- `apps/docs/src/modules/docs/contents/kernel/components/layout/overview/index.en.mdx`（修改）
- `apps/docs/src/modules/docs/contents/kernel/packages/vanilla/index.zh.mdx`（修改）
- `apps/docs/src/modules/docs/contents/kernel/packages/vanilla/index.en.mdx`（修改）
- `apps/docs/src/modules/docs/contents/kernel/get-start/index.zh.mdx`（修改）
- `apps/docs/src/modules/docs/contents/kernel/get-start/index.en.mdx`（修改）
- `apps/docs/src/modules/docs/contents/kernel/get-start/get-start-step-4.zh.demo.tsx`（修改）
- `apps/docs/src/modules/docs/contents/kernel/get-start/get-start-step-4.en.demo.tsx`（修改）

若实现证明既有 owner barrel 未导出 `runtime.ts` 中的新函数，允许只在 `packages/kernel/render/src/animation/index.ts` 增加 `export *`；不得因此扩大包根公共面。偏离其余白名单需先回到本 ADR 补充理由。

### 测试象限

**Happy path（≥ 3）**：

- `undefined + no-preference`：解析结果为 `true`，React / Vanilla 正常生成 SVG 动画并启动 Canvas runtime。
- `true + reduce`：解析结果为 `true`，React SVG 的 CSS / WAAPI 与 React Canvas 的 rAF 均不会被系统偏好二次关闭。
- `false + no-preference`：解析结果为 `false`，两端都渲染完整静态终态且不创建动画句柄。
- `Vanilla true + reduce`：mountSvg、mountCanvas 与 renderToSvgString 都遵守显式开启。

**边界（≥ 2）**：

- `undefined + reduce`：保持当前默认，React / Vanilla 均静态降级。
- 无 `matchMedia`：`prefersReducedMotion()` 为 `false`，未传配置时默认开启且不抛错。
- `snapshotAt + true`：静态截帧优先，不 emit CSS / WAAPI、不启动 rAF。

**错误路径（≥ 2）**：

- Scene 没有 animation track 且显式 `true`：不创建时钟或句柄、不抛错，正常渲染静态 Scene。
- 宿主缺少可用动画能力且显式 `true`：沿用既有静态降级，不因强制开启而抛错或丢图。

**交互（≥ 2）**：

- React 未传 `animate` 时，系统偏好从 no-preference 切为 reduce：订阅触发重渲染并即时转为静态。
- React 显式 `true` / `false` 时切换系统偏好：最终结果保持显式值，不随媒体查询变化。
- CanvasHost 收到 Layout 解析后的 `true` 且系统为 reduce：不得再次读取系统偏好把它改回 `false`。
- manual 动画在显式 `true + reduce` 下：hydration animation handle 可 restart；显式 `false` 时仍为空操作。

### 依赖的现有元素

- `prefersReducedMotion`（`packages/kernel/render/src/animation/runtime.ts`）——继续负责读取宿主环境，结果交给新的纯解析函数。
- `usePrefersReducedMotion`（`packages/kernel/react/src/render/animation/reduced-motion.ts`）——继续负责 React 中的媒体查询订阅，不改变 owner。
- `LayoutProps.animate`（`packages/kernel/react/src/kernel/runtime/Layout.tsx`）——修改语义和 JSDoc，不改名称与类型。
- `VanillaAnimationOptions.enabled`（`packages/kernel/vanilla/src/runtime/types.ts`）——修改语义和 JSDoc，不改名称与类型。
- `BuildDocumentOptions.animate`（`packages/kernel/render/src/svg/builders/document.ts`）——继续作为已经解析的低层布尔值，不读取系统偏好。
- `snapshotAt`（React / Vanilla runtime）——保持对动画播放开关的更高优先级。
