import { LegendSchemaZhLocalization, LegendArtifactSchemaZhLocalization } from './legend-schema-localizations';
import {
  GridSchemaZhLocalization,
  GridLineSchemaZhLocalization,
  standardStrokeDescriptions,
} from './standard-presentation-localizations';

/** Scope 通道沿用 Grid 已维护的公共字段词典 */
const scopeDescriptions = Object.fromEntries(
  Object.entries(GridSchemaZhLocalization.descriptions).filter(
    ([key]) => !['namespace', 'type', 'bounds', 'line', 'border'].includes(key.split('.')[0]),
  ),
);
/** Standard Schema 展示与 API 投影共用的中文词典 */
const pageLocalizations = {
  AxesSchema: {
    descriptions: {
      namespace: 'Standard 复合组件命名空间',
      type: '静态参考轴类型',
      origin: '坐标轴、网格、刻度与文字共用的原点',
      x: '水平轴与垂直网格配置',
      y: '垂直轴与水平网格配置',
      'x.extent': '水平轴负向和正向长度',
      'y.extent': '垂直轴负向和正向长度',
      'x.line': '轴线与端点箭头，false 仅隐藏轴线',
      'y.line': '轴线与端点箭头，false 仅隐藏轴线',
      'x.ticks': '水平轴刻度与静态文字',
      'y.ticks': '垂直轴刻度与静态文字',
      'x.grid': '垂直于水平轴的网格线',
      'y.grid': '垂直于垂直轴的网格线',
      'x.label': '轴名、样式化文字或 false',
      'y.label': '轴名、样式化文字或 false',
    },
  },
  FrameSchema: {
    descriptions: {
      namespace: 'Standard 复合组件命名空间',
      type: '围合 Core Node 的语义分组类型',
      id: '外层 Scope 的可选稳定身份',
      localNamespace: '为子节点启用局部命名空间',
      boundingShape: '外层 Scope 的合成引用边界',
      border: '独立于根 Scope 级联的边框样式与圆角',
      padding: '最终内容与标题区边界外的间距，side 优先于 axis，再到 default',
      gap: '相邻标题组成部分及标题区与内容区的间距',
      headerDirection: '标题与说明的横向或纵向排列',
      title: '内容区上方的可选主标题',
      description: '内容区上方的可选辅助说明',
      children: '贡献内容边界的非空直接 Core Node 列表',
    },
  },
  SurfaceSchema: {
    descriptions: {
      namespace: 'Standard 复合组件命名空间',
      type: '单子图表面类型',
      child: '唯一的 Core 或 Tier 2 子图',
      padding: '均匀或分侧的非负内边距',
      overflow: '内容溢出保持可见或裁剪',
      background: '覆盖分配区域的可选填充',
      'background.fill': '背景填充',
      'background.fillOpacity': '背景填充不透明度',
      border: '分配边界上的可选描边',
      cornerRadius: '背景、边框与内容裁剪共用的非负圆角半径',
    },
  },
  ListSchema: {
    descriptions: {
      '/union/0/field/"namespace"': '命名空间，固定为 standard',
      '/union/0/field/"type"': '组件类型判别字段',
      '/union/0/field/"frame"': '绘制在容器内容下方的可选外框',
      '/union/0/field/"theme"': '由后代继承的稀疏主题覆盖',
      '/union/0/field/"id"': '可选命名引用 id，注册在父命名空间',
      '/union/0/field/"localNamespace"': '将后代节点、坐标及嵌套作用域的 id 限定在本地；容器自身 id 仍注册在父命名空间',
      '/union/0/field/"transforms"': '作用于全部内容的局部变换，数组末项先作用；平移在编译时展开',
      '/union/0/field/"placement"': '内在布局与局部变换后的最终放置方式',
      '/union/0/field/"zIndex"': '容器整体在同级图元中的堆叠顺序，不控制内部子图元',
      '/union/0/field/"clip"': '容器局部坐标中的整体裁切区域',
      '/union/0/field/"boundingShape"': '命名引用使用的包围轮廓：矩形或圆形',
      '/union/0/field/"meta"': '保留到 Scene 的 JSON 元数据，编译器不解释其内容',
      '/union/0/field/"animations"': '作用于容器整体的动画轨道，不影响布局，也不向子图元传播',
      '/union/0/field/"defaults"': '后代默认样式及其继承屏障',
      '/union/0/field/"defaults"/field/"node"': '节点默认样式，与其他通道独立',
      '/union/0/field/"defaults"/field/"path"': '路径类图元的默认样式；箭头使用 defaults.arrow',
      '/union/0/field/"defaults"/field/"label"': '节点标签与路径步骤标签的默认样式',
      '/union/0/field/"defaults"/field/"arrow"': '箭头默认样式',
      '/union/0/field/"defaults"/field/"reset"':
        '默认样式继承屏障：true 重置全部，或指定 node、path、label、arrow 通道',
      '/union/0/field/"items"': '按顺序排列的单元格；字符串默认只提供文字',
      '/union/0/field/"cellIdMode"':
        '身份来源：explicit 仅显式 id，string 使用 items 字符串，index 由 List id 与零基下标生成',
      '/union/0/field/"items"/array/union/1/field/"id"': '当前容器内唯一的可选单元格 id',
      '/union/0/field/"items"/array/union/1/field/"content"': '文字或唯一可绘制 child，支持已注册的第三方复合组件',
      '/union/0/field/"items"/array/union/1/field/"style"': 'List / Map 单元格的稀疏外观覆盖',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"color"':
        '主色，描边、填充、标签与箭头可继承，独立设置优先',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"stroke"': '描边颜色或绘制对象',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"lineCap"':
        '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"lineJoin"':
        '折角样式，省略为 miter；round 圆角，bevel 切角',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"opacity"': '单元格整体透明度',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"strokeOpacity"': '仅描边透明度',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"fill"': '填充颜色或绘制对象',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"textColor"':
        '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
      '/union/0/field/"items"/array/union/1/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
      '/union/0/field/"items"/array/union/1/field/"layout"': '稀疏单格尺寸、内边距和溢出覆盖',
      '/union/0/field/"items"/array/union/1/field/"layout"/field/"width"':
        '含内边距的固定边框宽度；auto 使用全组最大宽度，content 使用当前格内容宽度加内边距',
      '/union/0/field/"items"/array/union/1/field/"layout"/field/"height"':
        '含内边距的固定边框高度，auto 使用结构的自然尺寸',
      '/union/0/field/"items"/array/union/1/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
      '/union/0/field/"items"/array/union/1/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
      '/union/0/field/"data"': '此分支禁止 data',
      '/union/0/field/"dataObjectDisplay"': '此分支禁止 dataObjectDisplay',
      '/union/0/field/"style"': 'List / Map 单元格的稀疏外观覆盖',
      '/union/0/field/"style"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
      '/union/0/field/"style"/field/"stroke"': '描边颜色或绘制对象',
      '/union/0/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
      '/union/0/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
      '/union/0/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
      '/union/0/field/"style"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
      '/union/0/field/"style"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
      '/union/0/field/"style"/field/"opacity"': '单元格整体透明度',
      '/union/0/field/"style"/field/"strokeOpacity"': '仅描边透明度',
      '/union/0/field/"style"/field/"fill"': '填充颜色或绘制对象',
      '/union/0/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
      '/union/0/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
      '/union/0/field/"style"/field/"textColor"':
        '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
      '/union/0/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
      '/union/0/field/"label"': '容器附属标签，通过 position 与 distance 定位',
      '/union/0/field/"layout"': 'List 单元格分配与排列',
      '/union/0/field/"layout"/field/"width"':
        '含内边距的固定边框宽度；auto 使用全组最大宽度，content 使用各格内容宽度加内边距',
      '/union/0/field/"layout"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
      '/union/0/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
      '/union/0/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
      '/union/0/field/"layout"/field/"direction"': '单轴排列方向，不自动换行',
      '/union/0/field/"layout"/field/"gap"': '相邻单元格及索引条之间的距离',
      '/union/0/field/"index"': 'false 隐藏索引；true 或对象启用索引带',
      '/union/0/field/"index"/union/1/field/"position"': 'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
      '/union/0/field/"index"/union/1/field/"start"': '显示索引的非负整数起点，不作为单元格身份',
      '/union/0/field/"index"/union/1/field/"style"': '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
      '/union/0/field/"index"/union/1/field/"style"/field/"font"': '索引字体，按字段继承整体字体',
      '/union/0/field/"index"/union/1/field/"style"/field/"textColor"':
        '索引文字颜色，默认继承整体文本颜色；支持主色派生与对比色',
      '/union/0/field/"index"/union/1/field/"style"/field/"color"': '索引主色，沿用 Core 的 currentColor 继承规则',
      '/union/0/field/"index"/union/1/field/"style"/field/"opacity"': '索引文字透明度，范围为 0 到 1',
      '/union/1/field/"namespace"': '命名空间，固定为 standard',
      '/union/1/field/"type"': '组件类型判别字段',
      '/union/1/field/"frame"': '绘制在容器内容下方的可选外框',
      '/union/1/field/"theme"': '由后代继承的稀疏主题覆盖',
      '/union/1/field/"id"': '可选命名引用 id，注册在父命名空间',
      '/union/1/field/"localNamespace"': '将后代节点、坐标及嵌套作用域的 id 限定在本地；容器自身 id 仍注册在父命名空间',
      '/union/1/field/"transforms"': '作用于全部内容的局部变换，数组末项先作用；平移在编译时展开',
      '/union/1/field/"placement"': '内在布局与局部变换后的最终放置方式',
      '/union/1/field/"zIndex"': '容器整体在同级图元中的堆叠顺序，不控制内部子图元',
      '/union/1/field/"clip"': '容器局部坐标中的整体裁切区域',
      '/union/1/field/"boundingShape"': '命名引用使用的包围轮廓：矩形或圆形',
      '/union/1/field/"meta"': '保留到 Scene 的 JSON 元数据，编译器不解释其内容',
      '/union/1/field/"animations"': '作用于容器整体的动画轨道，不影响布局，也不向子图元传播',
      '/union/1/field/"defaults"': '后代默认样式及其继承屏障',
      '/union/1/field/"defaults"/field/"node"': '节点默认样式，与其他通道独立',
      '/union/1/field/"defaults"/field/"path"': '路径类图元的默认样式；箭头使用 defaults.arrow',
      '/union/1/field/"defaults"/field/"label"': '节点标签与路径步骤标签的默认样式',
      '/union/1/field/"defaults"/field/"arrow"': '箭头默认样式',
      '/union/1/field/"defaults"/field/"reset"':
        '默认样式继承屏障：true 重置全部，或指定 node、path、label、arrow 通道',
      '/union/1/field/"items"': '此分支禁止显式单元格',
      '/union/1/field/"data"': '递归展示 JSON 数组，默认不推导单元格 id',
      '/union/1/field/"dataObjectDisplay"':
        '非空对象值的展示方式：map 递归绘制，text 显示紧凑 JSON 文本；默认 map，嵌套数组继承此设置',
      '/union/1/field/"cellIdMode"': '身份来源：explicit 默认不生成 id，index 由 List id 与零基下标生成；禁止 string',
      '/union/1/field/"style"': 'List / Map 单元格的稀疏外观覆盖',
      '/union/1/field/"style"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
      '/union/1/field/"style"/field/"stroke"': '描边颜色或绘制对象',
      '/union/1/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
      '/union/1/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
      '/union/1/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
      '/union/1/field/"style"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
      '/union/1/field/"style"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
      '/union/1/field/"style"/field/"opacity"': '单元格整体透明度',
      '/union/1/field/"style"/field/"strokeOpacity"': '仅描边透明度',
      '/union/1/field/"style"/field/"fill"': '填充颜色或绘制对象',
      '/union/1/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
      '/union/1/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
      '/union/1/field/"style"/field/"textColor"':
        '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
      '/union/1/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
      '/union/1/field/"label"': '容器附属标签，通过 position 与 distance 定位',
      '/union/1/field/"layout"': 'List 单元格分配与排列',
      '/union/1/field/"layout"/field/"width"':
        '含内边距的固定边框宽度；auto 使用全组最大宽度，content 使用各格内容宽度加内边距',
      '/union/1/field/"layout"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
      '/union/1/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
      '/union/1/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
      '/union/1/field/"layout"/field/"direction"': '单轴排列方向，不自动换行',
      '/union/1/field/"layout"/field/"gap"': '相邻单元格及索引条之间的距离',
      '/union/1/field/"index"': 'false 隐藏索引；true 或对象启用索引带',
      '/union/1/field/"index"/union/1/field/"position"': 'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
      '/union/1/field/"index"/union/1/field/"start"': '显示索引的非负整数起点，不作为单元格身份',
      '/union/1/field/"index"/union/1/field/"style"': '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
      '/union/1/field/"index"/union/1/field/"style"/field/"font"': '索引字体，按字段继承整体字体',
      '/union/1/field/"index"/union/1/field/"style"/field/"textColor"':
        '索引文字颜色，默认继承整体文本颜色；支持主色派生与对比色',
      '/union/1/field/"index"/union/1/field/"style"/field/"color"': '索引主色，沿用 Core 的 currentColor 继承规则',
      '/union/1/field/"index"/union/1/field/"style"/field/"opacity"': '索引文字透明度，范围为 0 到 1',
    },
  },
  MapSchema: {
    descriptions: {
      '/union/0/field/"namespace"': '命名空间，固定为 standard',
      '/union/0/field/"type"': '组件类型判别字段',
      '/union/0/field/"frame"': '绘制在容器内容下方的可选外框',
      '/union/0/field/"theme"': '由后代继承的稀疏主题覆盖',
      '/union/0/field/"id"': '可选命名引用 id，注册在父命名空间',
      '/union/0/field/"localNamespace"': '将后代节点、坐标及嵌套作用域的 id 限定在本地；容器自身 id 仍注册在父命名空间',
      '/union/0/field/"transforms"': '作用于全部内容的局部变换，数组末项先作用；平移在编译时展开',
      '/union/0/field/"placement"': '内在布局与局部变换后的最终放置方式',
      '/union/0/field/"zIndex"': '容器整体在同级图元中的堆叠顺序，不控制内部子图元',
      '/union/0/field/"clip"': '容器局部坐标中的整体裁切区域',
      '/union/0/field/"boundingShape"': '命名引用使用的包围轮廓：矩形或圆形',
      '/union/0/field/"meta"': '保留到 Scene 的 JSON 元数据，编译器不解释其内容',
      '/union/0/field/"animations"': '作用于容器整体的动画轨道，不影响布局，也不向子图元传播',
      '/union/0/field/"defaults"': '后代默认样式及其继承屏障',
      '/union/0/field/"defaults"/field/"node"': '节点默认样式，与其他通道独立',
      '/union/0/field/"defaults"/field/"path"': '路径类图元的默认样式；箭头使用 defaults.arrow',
      '/union/0/field/"defaults"/field/"label"': '节点标签与路径步骤标签的默认样式',
      '/union/0/field/"defaults"/field/"arrow"': '箭头默认样式',
      '/union/0/field/"defaults"/field/"reset"':
        '默认样式继承屏障：true 重置全部，或指定 node、path、label、arrow 通道',
      '/union/0/field/"entries"': '按顺序展示的键值对，不是 JavaScript Map',
      '/union/0/field/"entries"/array/field/"key"': '键单元格',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"id"': '当前容器内唯一的可选单元格 id',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"content"':
        '文字或唯一可绘制 child，支持已注册的第三方复合组件',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"': 'List / Map 单元格的稀疏外观覆盖',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"color"':
        '主色，描边、填充、标签与箭头可继承，独立设置优先',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"stroke"': '描边颜色或绘制对象',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"dashPattern"':
        '虚线各段长度，省略为实线',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"dashOffset"':
        '虚线偏移，可为正或负的有限值',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"lineCap"':
        '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"lineJoin"':
        '折角样式，省略为 miter；round 圆角，bevel 切角',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"opacity"': '单元格整体透明度',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"strokeOpacity"': '仅描边透明度',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"fill"': '填充颜色或绘制对象',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"font"':
        '内容文字的字体设置，省略字段沿用文字默认',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"textColor"':
        '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"layout"': '稀疏单格尺寸、内边距和溢出覆盖',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"layout"/field/"width"':
        '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"layout"/field/"height"':
        '含内边距的固定边框高度，auto 使用结构的自然尺寸',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
      '/union/0/field/"entries"/array/field/"key"/union/1/field/"layout"/field/"overflow"':
        '保留视觉溢出或裁切到单元格分配区域',
      '/union/0/field/"entries"/array/field/"value"': '值单元格',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"id"': '当前容器内唯一的可选单元格 id',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"content"':
        '文字或唯一可绘制 child，支持已注册的第三方复合组件',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"': 'List / Map 单元格的稀疏外观覆盖',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"color"':
        '主色，描边、填充、标签与箭头可继承，独立设置优先',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"stroke"': '描边颜色或绘制对象',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"strokeWidth"':
        '描边宽度，使用绘图单位',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"dashPattern"':
        '虚线各段长度，省略为实线',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"dashOffset"':
        '虚线偏移，可为正或负的有限值',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"lineCap"':
        '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"lineJoin"':
        '折角样式，省略为 miter；round 圆角，bevel 切角',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"opacity"': '单元格整体透明度',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"strokeOpacity"': '仅描边透明度',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"fill"': '填充颜色或绘制对象',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"font"':
        '内容文字的字体设置，省略字段沿用文字默认',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"textColor"':
        '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"style"/field/"cornerRadius"':
        '大于或等于零的有限数值',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"layout"': '稀疏单格尺寸、内边距和溢出覆盖',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"layout"/field/"width"':
        '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"layout"/field/"height"':
        '含内边距的固定边框高度，auto 使用结构的自然尺寸',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"layout"/field/"padding"':
        '统一或按边设置的非负内边距',
      '/union/0/field/"entries"/array/field/"value"/union/1/field/"layout"/field/"overflow"':
        '保留视觉溢出或裁切到单元格分配区域',
      '/union/0/field/"data"': '此分支禁止 data',
      '/union/0/field/"dataObjectDisplay"': '此分支禁止 dataObjectDisplay',
      '/union/0/field/"style"': '共同单元格样式及键值角色覆盖',
      '/union/0/field/"style"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
      '/union/0/field/"style"/field/"stroke"': '描边颜色或绘制对象',
      '/union/0/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
      '/union/0/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
      '/union/0/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
      '/union/0/field/"style"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
      '/union/0/field/"style"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
      '/union/0/field/"style"/field/"opacity"': '单元格整体透明度',
      '/union/0/field/"style"/field/"strokeOpacity"': '仅描边透明度',
      '/union/0/field/"style"/field/"fill"': '填充颜色或绘制对象',
      '/union/0/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
      '/union/0/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
      '/union/0/field/"style"/field/"textColor"':
        '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
      '/union/0/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
      '/union/0/field/"style"/field/"key"': '键的样式覆盖，优先于共同字段',
      '/union/0/field/"style"/field/"key"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
      '/union/0/field/"style"/field/"key"/field/"stroke"': '描边颜色或绘制对象',
      '/union/0/field/"style"/field/"key"/field/"strokeWidth"': '描边宽度，使用绘图单位',
      '/union/0/field/"style"/field/"key"/field/"dashPattern"': '虚线各段长度，省略为实线',
      '/union/0/field/"style"/field/"key"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
      '/union/0/field/"style"/field/"key"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
      '/union/0/field/"style"/field/"key"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
      '/union/0/field/"style"/field/"key"/field/"opacity"': '单元格整体透明度',
      '/union/0/field/"style"/field/"key"/field/"strokeOpacity"': '仅描边透明度',
      '/union/0/field/"style"/field/"key"/field/"fill"': '填充颜色或绘制对象',
      '/union/0/field/"style"/field/"key"/field/"fillOpacity"': '仅背景填充透明度',
      '/union/0/field/"style"/field/"key"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
      '/union/0/field/"style"/field/"key"/field/"textColor"':
        '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
      '/union/0/field/"style"/field/"key"/field/"cornerRadius"': '大于或等于零的有限数值',
      '/union/0/field/"style"/field/"value"': '值的样式覆盖，优先于共同字段',
      '/union/0/field/"style"/field/"value"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
      '/union/0/field/"style"/field/"value"/field/"stroke"': '描边颜色或绘制对象',
      '/union/0/field/"style"/field/"value"/field/"strokeWidth"': '描边宽度，使用绘图单位',
      '/union/0/field/"style"/field/"value"/field/"dashPattern"': '虚线各段长度，省略为实线',
      '/union/0/field/"style"/field/"value"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
      '/union/0/field/"style"/field/"value"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
      '/union/0/field/"style"/field/"value"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
      '/union/0/field/"style"/field/"value"/field/"opacity"': '单元格整体透明度',
      '/union/0/field/"style"/field/"value"/field/"strokeOpacity"': '仅描边透明度',
      '/union/0/field/"style"/field/"value"/field/"fill"': '填充颜色或绘制对象',
      '/union/0/field/"style"/field/"value"/field/"fillOpacity"': '仅背景填充透明度',
      '/union/0/field/"style"/field/"value"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
      '/union/0/field/"style"/field/"value"/field/"textColor"':
        '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
      '/union/0/field/"style"/field/"value"/field/"cornerRadius"': '大于或等于零的有限数值',
      '/union/0/field/"label"': '容器附属标签，通过 position 与 distance 定位',
      '/union/0/field/"layout"': 'Map 双列布局与间距',
      '/union/0/field/"layout"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
      '/union/0/field/"layout"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
      '/union/0/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
      '/union/0/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
      '/union/0/field/"layout"/field/"gap"': '行列共用间距或分别设置 row / column',
      '/union/0/field/"layout"/field/"gap"/union/1/field/"row"': '大于或等于零的有限数值',
      '/union/0/field/"layout"/field/"gap"/union/1/field/"column"': '大于或等于零的有限数值',
      '/union/0/field/"layout"/field/"key"': '键的布局覆盖，优先于共同字段',
      '/union/0/field/"layout"/field/"key"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
      '/union/0/field/"layout"/field/"key"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
      '/union/0/field/"layout"/field/"key"/field/"padding"': '统一或按边设置的非负内边距',
      '/union/0/field/"layout"/field/"key"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
      '/union/0/field/"layout"/field/"value"': '值的布局覆盖，优先于共同字段',
      '/union/0/field/"layout"/field/"value"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
      '/union/0/field/"layout"/field/"value"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
      '/union/0/field/"layout"/field/"value"/field/"padding"': '统一或按边设置的非负内边距',
      '/union/0/field/"layout"/field/"value"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
      '/union/1/field/"namespace"': '命名空间，固定为 standard',
      '/union/1/field/"type"': '组件类型判别字段',
      '/union/1/field/"frame"': '绘制在容器内容下方的可选外框',
      '/union/1/field/"theme"': '由后代继承的稀疏主题覆盖',
      '/union/1/field/"id"': '可选命名引用 id，注册在父命名空间',
      '/union/1/field/"localNamespace"': '将后代节点、坐标及嵌套作用域的 id 限定在本地；容器自身 id 仍注册在父命名空间',
      '/union/1/field/"transforms"': '作用于全部内容的局部变换，数组末项先作用；平移在编译时展开',
      '/union/1/field/"placement"': '内在布局与局部变换后的最终放置方式',
      '/union/1/field/"zIndex"': '容器整体在同级图元中的堆叠顺序，不控制内部子图元',
      '/union/1/field/"clip"': '容器局部坐标中的整体裁切区域',
      '/union/1/field/"boundingShape"': '命名引用使用的包围轮廓：矩形或圆形',
      '/union/1/field/"meta"': '保留到 Scene 的 JSON 元数据，编译器不解释其内容',
      '/union/1/field/"animations"': '作用于容器整体的动画轨道，不影响布局，也不向子图元传播',
      '/union/1/field/"defaults"': '后代默认样式及其继承屏障',
      '/union/1/field/"defaults"/field/"node"': '节点默认样式，与其他通道独立',
      '/union/1/field/"defaults"/field/"path"': '路径类图元的默认样式；箭头使用 defaults.arrow',
      '/union/1/field/"defaults"/field/"label"': '节点标签与路径步骤标签的默认样式',
      '/union/1/field/"defaults"/field/"arrow"': '箭头默认样式',
      '/union/1/field/"defaults"/field/"reset"':
        '默认样式继承屏障：true 重置全部，或指定 node、path、label、arrow 通道',
      '/union/1/field/"entries"': '此分支禁止显式单元格',
      '/union/1/field/"data"': '递归展示 JSON 对象，不推导单元格 id',
      '/union/1/field/"dataObjectDisplay"':
        '非空对象值的展示方式：map 递归绘制，text 显示紧凑 JSON 文本；默认 map，根对象仍是 Map',
      '/union/1/field/"style"': '共同单元格样式及键值角色覆盖',
      '/union/1/field/"style"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
      '/union/1/field/"style"/field/"stroke"': '描边颜色或绘制对象',
      '/union/1/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
      '/union/1/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
      '/union/1/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
      '/union/1/field/"style"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
      '/union/1/field/"style"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
      '/union/1/field/"style"/field/"opacity"': '单元格整体透明度',
      '/union/1/field/"style"/field/"strokeOpacity"': '仅描边透明度',
      '/union/1/field/"style"/field/"fill"': '填充颜色或绘制对象',
      '/union/1/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
      '/union/1/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
      '/union/1/field/"style"/field/"textColor"':
        '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
      '/union/1/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
      '/union/1/field/"style"/field/"key"': '键的样式覆盖，优先于共同字段',
      '/union/1/field/"style"/field/"key"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
      '/union/1/field/"style"/field/"key"/field/"stroke"': '描边颜色或绘制对象',
      '/union/1/field/"style"/field/"key"/field/"strokeWidth"': '描边宽度，使用绘图单位',
      '/union/1/field/"style"/field/"key"/field/"dashPattern"': '虚线各段长度，省略为实线',
      '/union/1/field/"style"/field/"key"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
      '/union/1/field/"style"/field/"key"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
      '/union/1/field/"style"/field/"key"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
      '/union/1/field/"style"/field/"key"/field/"opacity"': '单元格整体透明度',
      '/union/1/field/"style"/field/"key"/field/"strokeOpacity"': '仅描边透明度',
      '/union/1/field/"style"/field/"key"/field/"fill"': '填充颜色或绘制对象',
      '/union/1/field/"style"/field/"key"/field/"fillOpacity"': '仅背景填充透明度',
      '/union/1/field/"style"/field/"key"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
      '/union/1/field/"style"/field/"key"/field/"textColor"':
        '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
      '/union/1/field/"style"/field/"key"/field/"cornerRadius"': '大于或等于零的有限数值',
      '/union/1/field/"style"/field/"value"': '值的样式覆盖，优先于共同字段',
      '/union/1/field/"style"/field/"value"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
      '/union/1/field/"style"/field/"value"/field/"stroke"': '描边颜色或绘制对象',
      '/union/1/field/"style"/field/"value"/field/"strokeWidth"': '描边宽度，使用绘图单位',
      '/union/1/field/"style"/field/"value"/field/"dashPattern"': '虚线各段长度，省略为实线',
      '/union/1/field/"style"/field/"value"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
      '/union/1/field/"style"/field/"value"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
      '/union/1/field/"style"/field/"value"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
      '/union/1/field/"style"/field/"value"/field/"opacity"': '单元格整体透明度',
      '/union/1/field/"style"/field/"value"/field/"strokeOpacity"': '仅描边透明度',
      '/union/1/field/"style"/field/"value"/field/"fill"': '填充颜色或绘制对象',
      '/union/1/field/"style"/field/"value"/field/"fillOpacity"': '仅背景填充透明度',
      '/union/1/field/"style"/field/"value"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
      '/union/1/field/"style"/field/"value"/field/"textColor"':
        '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
      '/union/1/field/"style"/field/"value"/field/"cornerRadius"': '大于或等于零的有限数值',
      '/union/1/field/"label"': '容器附属标签，通过 position 与 distance 定位',
      '/union/1/field/"layout"': 'Map 双列布局与间距',
      '/union/1/field/"layout"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
      '/union/1/field/"layout"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
      '/union/1/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
      '/union/1/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
      '/union/1/field/"layout"/field/"gap"': '行列共用间距或分别设置 row / column',
      '/union/1/field/"layout"/field/"gap"/union/1/field/"row"': '大于或等于零的有限数值',
      '/union/1/field/"layout"/field/"gap"/union/1/field/"column"': '大于或等于零的有限数值',
      '/union/1/field/"layout"/field/"key"': '键的布局覆盖，优先于共同字段',
      '/union/1/field/"layout"/field/"key"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
      '/union/1/field/"layout"/field/"key"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
      '/union/1/field/"layout"/field/"key"/field/"padding"': '统一或按边设置的非负内边距',
      '/union/1/field/"layout"/field/"key"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
      '/union/1/field/"layout"/field/"value"': '值的布局覆盖，优先于共同字段',
      '/union/1/field/"layout"/field/"value"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
      '/union/1/field/"layout"/field/"value"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
      '/union/1/field/"layout"/field/"value"/field/"padding"': '统一或按边设置的非负内边距',
      '/union/1/field/"layout"/field/"value"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
    },
  },
};

/** Standard 共用的 Path 实例字段；几何字段由各形状补充 */
const shapeDescriptions: Record<string, string> = {
  namespace: 'Standard 复合组件命名空间',
  type: '形状类型判别字段',
  id: '图形的可选引用身份',
  meta: '透传至 Scene 的 JSON 元数据，编译器不解释其内容',
  animations: '作用于图形的声明式动画，不参与布局且不跨作用域继承',
  zIndex: '同级图形的绘制层级，数值越大越靠上',
  roundedCorners: '线段接头的几何圆角，与描边转角样式独立',
  rotate: '绕图形包络中心旋转的角度',
  scale: '绕图形包络中心缩放',
  label: '附着于路径的标签',
  marks: '沿路径按归一化位置放置的标记',
  style: '路径的稀疏视觉覆盖',
  center: '形状中心，坐标形式由几何分支决定',
  radius: '用户坐标单位中的半径；椭圆可分别指定两轴半径',
  diameter: '圆的直径',
  diameterX: '椭圆水平直径',
  diameterY: '椭圆垂直直径',
  from: '圆直径的第一个端点',
  to: '圆直径的第二个端点',
  corner1: '包围矩形的第一个角点',
  corner2: '包围矩形的对角点',
  box: '用于拟合形状的轴对齐包围盒',
  fit: '在包围盒中内接 contain 或外接 cover',
  inset: '包围盒的均匀内缩距离',
  outset: '包围盒的均匀外扩距离',
  startAngle: '起始角度，单位为度',
  endAngle: '终止角度，单位为度',
  sweepAngle: '有符号扫过角度；三个角度字段恰好指定两个',
  closed: '局部轮廓的闭合方式：开放、弦闭合或扇形闭合',
  close: '圆弧的闭合方式：开放、弦闭合或扇形闭合',
  width: '矩形宽度',
  height: '矩形高度',
  side: '正方形边长',
  cornerRadius: '矩形圆角半径，限制为短边长度的一半',
  sides: '正多边形边数，至少为 3',
  sideLength: '正多边形边长',
  points: '星形外顶点数量，至少为 2',
  innerRatio: '星形内半径与外半径之比',
  innerRadius: '内半径，不得超过外半径',
  outerRadius: '外半径',
};

/** 精确选择每个形状拥有的字段，未知字段不自动生成译文 */
const shapeLocalization = (fields: string) => ({
  descriptions: Object.fromEntries(fields.split(' ').map(key => [key, shapeDescriptions[key]])),
});

/** API 与 Schema 展示共同消费；canonical 路径保留联合分支语义 */
export const standardSchemaLocalizations: Record<
  string,
  { description?: string; descriptions: Readonly<Partial<Record<string, string>>> }
> = {
  ...pageLocalizations,
  GridSchema: GridSchemaZhLocalization,
  GridLineInputSchema: GridLineSchemaZhLocalization,
  LegendSchema: LegendSchemaZhLocalization,
  LegendArtifactSchema: LegendArtifactSchemaZhLocalization,
};
for (const name of ['AxesSchema', 'FrameSchema', 'SurfaceSchema']) {
  standardSchemaLocalizations[name] = {
    descriptions: { ...scopeDescriptions, ...standardSchemaLocalizations[name].descriptions },
  };
}
standardSchemaLocalizations.ArcSchema = shapeLocalization(
  'id meta animations zIndex roundedCorners rotate scale label marks style namespace type center radius startAngle endAngle sweepAngle close',
);
standardSchemaLocalizations.CircleSchema = shapeLocalization(
  'id meta animations zIndex roundedCorners rotate scale label marks style namespace type startAngle endAngle sweepAngle closed center radius diameter from to inset outset fit corner1 corner2 box',
);
standardSchemaLocalizations.EllipseSchema = shapeLocalization(
  'id meta animations zIndex roundedCorners rotate scale label marks style namespace type startAngle endAngle sweepAngle closed center radius diameterX diameterY inset outset corner1 corner2 box',
);
standardSchemaLocalizations.PolygonSchema = shapeLocalization(
  'id meta animations zIndex roundedCorners rotate scale label marks style namespace type center sides radius sideLength',
);
standardSchemaLocalizations.RectangleSchema = shapeLocalization(
  'id meta animations zIndex roundedCorners rotate scale label marks style namespace type cornerRadius corner1 corner2 center width height side',
);
standardSchemaLocalizations.SectorSchema = shapeLocalization(
  'id meta animations zIndex roundedCorners rotate scale label marks style namespace type startAngle endAngle sweepAngle center radius innerRadius',
);
standardSchemaLocalizations.StarSchema = shapeLocalization(
  'id meta animations zIndex roundedCorners rotate scale label marks style namespace type center points outerRadius innerRadius innerRatio',
);

const frameHeaderDescriptions = {
  id: '标题或说明节点的可选引用身份',
  shape: '节点外形，可使用内置或已注册形状',
  boundary: '路径连接此节点时使用的默认边界',
  meta: '透传至 Scene 的 JSON 元数据',
  animations: '节点动画轨道，不参与布局或跨作用域继承',
  rotate: '绕节点中心旋转的角度，正值在视觉上顺时针',
  cornerRadius: '矩形节点的圆角半径',
  scale: '节点的均匀或分轴缩放',
  label: '附着于节点边界的标签',
  zIndex: '同级图元的绘制层级',
  style: '节点视觉覆盖',
  layout: '节点尺寸、间距与文字排布',
  text: '作为标题或辅助说明呈现的必填节点文字',
};
standardSchemaLocalizations.FrameTitleSchema = { descriptions: frameHeaderDescriptions };
standardSchemaLocalizations.FrameDescriptionSchema = { descriptions: frameHeaderDescriptions };
standardSchemaLocalizations.FrameBorderSchema = {
  descriptions: {
    style: '独立的边框描边样式',
    cornerRadius: '边框的非负圆角半径',
  },
};

standardSchemaLocalizations.SurfaceSchema = {
  descriptions: {
    ...standardSchemaLocalizations.SurfaceSchema.descriptions,
    ...Object.fromEntries(
      Object.entries(standardStrokeDescriptions)
        .filter(([key]) => key !== 'zIndex')
        .map(([key, value]) => [`border.${key}`, value]),
    ),
  },
};
standardSchemaLocalizations.ArcSchema = {
  descriptions: {
    ...standardSchemaLocalizations.ArcSchema.descriptions,
    ...Object.fromEntries(
      Object.entries(standardStrokeDescriptions)
        .filter(([key]) => key !== 'zIndex')
        .map(([key, value]) => [`style.${key}`, value]),
    ),
    'style.fill': '主几何的填充画笔',
    'style.fillOpacity': '填充区域的不透明度',
    'style.shadow': '主几何的投影，可使用预设或显式阴影对象',
    'style.blendMode': '与下方内容的混合模式；省略时为正常叠加',
    'style.fillRule': '自交或嵌套路径的填充规则：nonzero 或 evenodd',
  },
};

for (const name of ['PolygonSchema', 'StarSchema']) {
  standardSchemaLocalizations[name] = {
    descriptions: { ...standardSchemaLocalizations[name].descriptions, rotate: '首个外顶点的角度，单位为度' },
  };
}

/** 顶层概述与字段词典一起复用，避免中文页面回退到英文概述 */
const summaries: Record<string, string> = {
  CircleSchema: '使用互斥的几何输入描述圆形，编译为基础路径',
  EllipseSchema: '使用中心、半径或包围盒描述椭圆',
  RectangleSchema: '使用角点、中心与尺寸或边长描述矩形',
  PolygonSchema: '使用边数、中心及半径或边长描述正多边形',
  StarSchema: '使用外顶点数量及内外半径描述星形',
  ArcSchema: '使用中心、半径与角度描述圆弧或椭圆弧',
  SectorSchema: '使用角度与内外半径描述扇形或环形扇区',
  FrameTitleSchema: '无须显式位置的主标题节点输入',
  FrameDescriptionSchema: '无须显式位置的辅助说明节点输入',
};
for (const [name, description] of Object.entries(summaries)) {
  standardSchemaLocalizations[name] = { ...standardSchemaLocalizations[name], description };
}
