# ADR-02：circle 作为 ellipse 的 equal preset

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[ADR-01 shape 参数化机制](./01-shape-params-generalization.md)

## 背景

circle 与 ellipse 的 boundaryPoint、anchor、edgePoint 和 emit 几何相同；差异只在 circumscribe：circle 使用等轴的内框对角线半长，ellipse 对两个轴分别乘以 √2。保留两套实现会造成几何重复。

## 决策

ellipse 的参数 schema 增加 circumscribe 策略：

- proportional（默认）按轴分别以 √2 扩展，保持 ellipse 行为
- equal 使两个半轴都为 hypot(innerHalfWidth, innerHalfHeight)，表达正圆

circle 不再拥有独立几何，compile 将裸 shape circle 规范化为 type ellipse、params { circumscribe: equal }。shape: circle 和 shape: ellipse 两种旧写法都保留；其他几何函数只实现一次。

## 兼容性与实现结果

既有 circle/ellipse 字符串写法和连接语义保持兼容，circle 已作为 ellipse preset 实现。

## 遗留风险

其他形状的 preset 别名应继续复用单一几何实现，不应重新建立同义注册项。
