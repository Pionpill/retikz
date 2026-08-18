# ADR-03：arc/sector 参数化形状

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[ADR-01 shape 参数化机制](./01-shape-params-generalization.md)

## 背景

Core 需要一等、可连接的弧和环楔形状，以支持 polar bar、pie、donut、rose 和角度标注。裸 Path 能绘制轮廓，但没有 Node 的 boundaryPoint、anchor 和连接语义。

## 决策

注册两个参数化 shape：

- sector 参数为 innerRadius >= 0、outerRadius > 0、startAngle、endAngle；innerRadius = 0 时退化为实心扇片
- arc 参数为 radius > 0、startAngle、endAngle 和可选 close；close 为 true 时闭合为可填充弦段，否则为开放描边弧
- 角度遵循 core polar 约定：0° 为 +x、90° 为屏幕坐标 +y；sector 的扫角语义与该约定一致
- sectorGeometry/arcGeometry 是 circumscribe、boundaryPoint、anchor 和 emit 的共同几何真源。AABB 必须包含弧跨过 0°/90°/180°/270° 的极值点；position 为 AABB 中心，圆心/质心偏移由几何函数显式处理，尺寸由半径参数决定而非文本内框
- sector 和 arc 的专属 anchor 可表达 apex、弧中点、起止边等；boundaryPoint 从正确的几何中心或质心向外求交

## 兼容性与实现结果

arc/sector 以注册 shape 落地，renderer 继续消费已有 primitive，plot 可将 polar mark 下沉为可连接的 sector Node。

## 遗留风险

非矩形形状的更深层相对定位仍以 AABB 中心和显式 anchor 为边界；调用方必须提供合法半径和角度参数。
