---
description: '引用未解析、锚点不存在或路径不足以绘制时，调用者应能获知问题及其输入位置'
keywords: 'CompileOptions、onWarn、silent、fail、warning、console.warn、CompileOptions.onWarn、CompileWarning.code'
---

# ADR-015：`CompileOptions.onWarn` 收集器——路径解析 silent fail → 显式 warning

- 状态：Partially Superseded
- 决策日期：2026-05-13
- 后续决策：[kernel v0.5/079](../v0.5/079-structured-property-paths.md)、[kernel v0.5/082](../v0.5/082-scene-reconciler-entry.md)

## 保留的决策

引用未解析、锚点不存在或路径不足以绘制时，调用者应能获知问题及其输入位置。诊断不是 renderer 输出；程序化消费不应依赖解析控制台文案。

## 修订边界

早期示例使用一次性 compileToScene 调用和字符串 locator。当前编译执行入口与结构化来源定位分别由后继决策定义，不能据此推回旧入口。
