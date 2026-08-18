# ADR-04：动画开关采用显式值覆盖系统偏好的三态语义

- 状态：Accepted
- 决策日期：2026-07-12
- 关联：[v0.3 alpha.5 runtime control](../../v0.3/alpha.5/04-runtime-control.md)

## 背景

`Layout.animate` 与 Vanilla `animation.enabled` 的旧语义把“省略”和显式 `true` 混在一起：reduced-motion 环境会同时关闭二者。系统偏好应只作为未指定值的默认来源，不能覆盖作者的显式选择

## 决策

React 保留 `LayoutProps.animate`，Vanilla 保留 `VanillaAnimationOptions.enabled`，共享纯函数：

```ts
const resolveAnimationEnabled = (explicit: boolean | undefined, reducedMotion: boolean): boolean =>
  explicit ?? !reducedMotion;
```

三态语义固定：省略值跟随系统；显式 `true` 强制开启；显式 `false` 强制关闭。无 `matchMedia` 的 SSR / 非浏览器环境视为系统未要求减少动态效果，因此省略时默认开启。SVG document builder 与 Canvas renderer 只消费解析后的 boolean，不读取媒体查询

React 额外提供 `AnimationModeProvider`：`system` 跟随系统，`enabled` 强制开启，`disabled` 强制关闭；嵌套时最近 Provider 生效。优先级为 `snapshotAt > 最近 Provider > Layout.animate > 系统偏好`，`snapshotAt` 始终输出静态截帧

## 行为、失败语义与兼容性

在 reduced-motion 环境下显式 `true` 的行为变为强制播放；希望跟随系统的调用方必须省略。属性名称与类型保持，新增 Provider 公共契约；不把宿主环境、Provider 或 adapter 配置写入 Core IR / Scene，不使用包级全局变量

Vanilla 继续按每次 mount / render options 解析，不订阅挂载后的系统偏好变化；需要动态响应须另行设计

## 最终结果与遗留边界

React、Vanilla 和 Render 共享同一三态真值表，低层 renderer 不重复解析系统偏好。animation track、easing、trigger 和 snapshot 契约保持不变
