---
description: 'SVG 有 DOM 元素，Canvas 只有画布；业务事件却应能指向同一个语义目标。'
keywords: 'HydrationContext、HydrationTarget、事件水合与无界面交互、runtime、SVG、Canvas、hydration、context、水合、事件上下文、Headless、interaction'
---

# 事件水合与无界面交互

## 设计目的

SVG 有 DOM 元素，Canvas 只有画布；业务事件却应能指向同一个语义目标。水合负责把后端命中接到宿主处理器，而不把回调、选中态或编辑器策略写入图形。

## 决策

`HydrationContext` 是宿主事件处理器获得的上下文；`HydrationTarget` 描述事件目标。

handler 属于宿主运行时，不写入 IR。SVG 从事件目标找到语义 id，Canvas 将指针换到场景坐标、按逆绘制顺序命中几何；两者向同一分发层报告 id。卸载需释放监听。

水合事件提供后端中立的上下文，按用户 id 关联语义元素，不要求调用者从某个 DOM 节点猜出完整对象。SVG 与 Canvas 可有不同的拾取实现。

命中测试负责定位元素，hover、选择、焦点与拖动等状态归宿主。无界面交互不能让编译结果依赖编辑器 UI 或可变宿主状态。

## 历史记录

- Kernel v0.3：在语义元素上绑定后端中立的事件上下文（ADR-008、ADR-022）。
- Kernel v0.4：区分无界面交互基础与编辑器策略（ADR-029）。
