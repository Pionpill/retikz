---
description: '分面图、叠加多轴和共享轨道都需要回答：图元绑定哪个坐标视图，视图如何排列，哪些尺度或辅助线共享。'
keywords: 'IRPlot、CoordinateViewSchema、多视图与布局、composition、Composition、data、structure、authoring、API、redesign'
---

# 多视图与布局

## 设计目的

分面图、叠加多轴和共享轨道都需要回答：图元绑定哪个坐标视图，视图如何排列，哪些尺度或辅助线共享。把视图、排列和共享策略分开，才能改布局而不必重写图元的坐标绑定。

## 决策

`IRPlot` 的 composition 字段承载组合声明；其中的视图结构由 `CoordinateViewSchema` 定义。

composition 内以 views 表达可绑定的坐标视图，defaultView 指定省略绑定时的视图，arrangements 用 facet 或 tracks 安排视图。mark 与 axis 用 coordinateView 绑定；spacing 表达间距，resolve 表达共享策略。是否生成网格由轴决定，默认投放范围与是否生成是两回事。

## 历史记录

- Plot v0.1：统一视图绑定、分面、轨道与共享策略（ADR-088）。
