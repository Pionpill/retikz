# ADR-04：动画开关采用显式值覆盖系统偏好的三态语义

- 状态：Accepted
- 决策日期：2026-07-12
- 验收日期：2026-07-14
- 实现提交：`ce5af412`、`b2f51f62`
- 关联：[beta.2 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [v0.3 alpha.5 runtime control](../../v0.3/alpha.5/04-runtime-control.md)

## 背景

React 的 `<Layout animate>` 与 Vanilla 的 `animation.enabled` 都允许作者关闭动画，但旧实现把“未传”与“显式 `true`”合并处理：只要系统报告 `prefers-reduced-motion: reduce`，两者都会渲染静态终态。这样 `false` 是强制关闭，`true` 却不是强制开启，布尔值语义不对称。

系统偏好应作为未指定配置时的默认来源，不应覆盖调用方明确给出的值。该问题属于宿主 runtime 策略；环境信息、Provider 和 adapter 配置都不能进入 core IR、Scene 或 compile。

## 决策

React 保留 `LayoutProps.animate`，Vanilla 保留 `VanillaAnimationOptions.enabled`。两端共享 `@retikz/render/animation` 的纯函数：

```ts
export const resolveAnimationEnabled = (explicit: boolean | undefined, reducedMotion: boolean): boolean =>
  explicit ?? !reducedMotion;
```

统一三态语义：

| 作者意图 | React             | Vanilla                         | 最终行为                  |
| -------- | ----------------- | ------------------------------- | ------------------------- |
| 跟随系统 | 省略 `animate`    | 省略 `animation.enabled`        | `reduce` 时关闭，否则开启 |
| 强制开启 | `animate={true}`  | `animation: { enabled: true }`  | 不受系统偏好影响          |
| 强制关闭 | `animate={false}` | `animation: { enabled: false }` | 始终关闭                  |

无 `matchMedia` 的 SSR / 非浏览器环境按“系统未要求减少动态效果”处理，因此省略开关时默认开启。低层 SVG document builder 与 Canvas renderer 只消费解析后的布尔值，不自行读取媒体查询。

React 额外公开 `AnimationModeProvider`，让编辑器、文档预览或测试宿主统一控制一棵组件树：

```tsx
<AnimationModeProvider mode="system">{/* 跟随系统 */}</AnimationModeProvider>
<AnimationModeProvider mode="enabled">{/* 强制开启 */}</AnimationModeProvider>
<AnimationModeProvider mode="disabled">{/* 强制关闭 */}</AnimationModeProvider>
```

最终优先级为：

```text
snapshotAt > 最近的 AnimationModeProvider > Layout.animate > 系统偏好
```

Provider 的 `system` 会忽略后代 `<Layout animate>` 并重新跟随系统；`enabled` / `disabled` 强制覆盖。嵌套时最近的 Provider 生效。`snapshotAt` 始终输出静态截帧，不启动动画。

## 兼容性与否决方案

- **行为变更**：在 reduced-motion 环境下，显式 `true` 现在会强制播放；希望继续跟随系统的调用方应省略该值。
- `LayoutProps.animate?: boolean` 与 `VanillaAnimationOptions.enabled?: boolean` 的名称和类型不变。
- `@retikz/react` 新增 `AnimationMode`、`AnimationModeProviderProps` 与 `AnimationModeProvider` 公共导出。
- 不统一 React 与 Vanilla 的属性形状：两端保留符合各自 API 组织方式的命名。
- 不让 core 或低层 renderer 读取宿主环境：这会污染 renderer-agnostic 边界并产生重复解析。
- 不用包级全局变量控制动画：Provider 只作用于 React 子树，Vanilla 继续按每次 mount / render options 解析。

## 最终实现

- render animation owner 提供 `resolveAnimationEnabled()`，React 与 Vanilla 共用同一真值表。
- React `<Layout>` 订阅系统偏好，解析最近 Provider 与自身 `animate`，再把最终布尔值传给 SVG / Canvas host。
- Vanilla 的 `mountSvg`、`mountCanvas` 与 `renderToSvgString` 统一解析 `animation.enabled`；已挂载 view 不动态订阅系统偏好。
- 文档站用持久化动画模式包裹共享 PreviewPanel，并同步 Layout、animation、Vanilla 与快速开始双语文档。

## 验证

2026-07-14 在 `next` release 基线上复核：

- `pnpm run check:kernel` 通过。
- render 动画 runtime 定向回归通过：1 file / 27 tests；render 全量测试通过：45 files / 374 tests。
- React 动画、Provider、reduced-motion 与 public API 定向回归通过。
- Vanilla plain spec、动画与 SSR 定向回归通过：3 files / 35 tests。
- 覆盖三态真值表、SVG / Canvas、Provider 嵌套、系统偏好变化、`snapshotAt`、无 `matchMedia` 和静态降级。

主 agent 对 ADR、changelog、双语 docs、实现与测试做 Contract Auditor，未发现 BLOCKING 偏差。

## 遗留边界

- 不新增站点之外的全局动画设置，不改变 animation track、easing、trigger 或 snapshot 契约。
- Vanilla 不订阅挂载后的系统偏好变化；若需要动态响应，必须另行设计生命周期。
- 显式 `true` 会覆盖用户的 reduced-motion 偏好，文档应仅建议在作者确实需要强制播放且用户可理解或控制时使用。
