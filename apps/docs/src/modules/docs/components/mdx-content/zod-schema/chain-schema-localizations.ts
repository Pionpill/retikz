/** Chain 字段中文说明，与 Schema 的 canonical path 对应 */
export const chainSchemaLocalization = {
  description: '串并联结构、JSON 数据或递归骨架',
  descriptions: {
    '/union/0/field/"namespace"': 'Standard 复合组件命名空间',
    '/union/0/field/"type"': '串并联内容呈现类型',
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
    '/union/0/field/"defaults"/field/"reset"': '默认样式继承屏障：true 重置全部，或指定 node、path、label、arrow 通道',
    '/union/0/field/"style"': '集合 单元格的稀疏外观覆盖',
    '/union/0/field/"style"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"style"/field/"opacity"': '主要图形整体透明度',
    '/union/0/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/0/field/"style"/field/"strokeOpacity"': '轮廓描边透明度',
    '/union/0/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/0/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/0/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/0/field/"style"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/0/field/"style"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/0/field/"style"/field/"fill"': '主要图形填充，可使用上下文颜色或画笔',
    '/union/0/field/"style"/field/"fillOpacity"': '填充区域透明度',
    '/union/0/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/0/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
    '/union/0/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
    '/union/0/field/"layout"': '尺寸和结构排布；并行块仅覆盖结构字段',
    '/union/0/field/"layout"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
    '/union/0/field/"layout"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
    '/union/0/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
    '/union/0/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
    '/union/0/field/"layout"/field/"gap"': '相邻项之间的主轴净间距',
    '/union/0/field/"layout"/field/"branchGap"': '相邻支路包围盒之间的交叉轴净间距',
    '/union/0/field/"layout"/field/"branchAlign"': '整个分支包围盒对齐，或以零基下标选择主干支路',
    '/union/0/field/"layout"/field/"branchAlign"/union/1/field/"branch"': '非负安全整数',
    '/union/0/field/"layout"/field/"spacing"': '各支路独立紧凑排布，或共享直属步骤轨道',
    '/union/0/field/"layout"/field/"justify"': '短支路在公共跨度中的起端、中心或末端位置',
    '/union/0/field/"layout"/field/"direction"': '主链方向：向右或向下',
    '/union/0/field/"connection"': '自动生成连接的局部呈现覆盖',
    '/union/0/field/"connection"/field/"route"': '连接路径策略；auto 在分支块两侧保留公共正交通道',
    '/union/0/field/"connection"/field/"path"': 'Core Path 的非结构性字段，不允许改写身份和步骤',
    '/union/0/field/"connection"/field/"path"/field/"meta"': '透传到 Scene 图元的 JSON 元数据，不参与编译语义',
    '/union/0/field/"connection"/field/"path"/field/"animations"':
      '原样传递到 Scene 的动画轨道，不影响布局或包围盒，不跨作用域继承',
    '/union/0/field/"connection"/field/"path"/field/"zIndex"':
      '同级图元的绘制层级，较大值在上；省略为零，同层按原始顺序',
    '/union/0/field/"connection"/field/"path"/field/"roundedCorners"': '线段接点的几何圆角半径；省略时保留尖角',
    '/union/0/field/"connection"/field/"path"/field/"rotate"': '绕路径包围盒中心旋转；先解析端点，再整体应用旋转',
    '/union/0/field/"connection"/field/"path"/field/"scale"': '绕路径包围盒中心缩放，与旋转使用相同中心',
    '/union/0/field/"connection"/field/"path"/field/"scale"/union/1/field/"x"': '横轴缩放系数',
    '/union/0/field/"connection"/field/"path"/field/"scale"/union/1/field/"y"': '纵轴缩放系数',
    '/union/0/field/"connection"/field/"path"/field/"label"': '附着于连接路径的标签',
    '/union/0/field/"connection"/field/"path"/field/"marks"': '按归一化位置放置路径标记，方向沿路径切线',
    '/union/0/field/"connection"/field/"path"/field/"style"': '路径外观字段逐项覆盖继承默认值',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"fill"': '主要图形填充，可使用上下文颜色或画笔',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"fillOpacity"': '填充区域透明度',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"strokeOpacity"': '轮廓描边透明度',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"opacity"': '主要图形整体透明度',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"shadow"': '主要图形的阴影，可使用预设或显式阴影配置',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"blendMode"':
      '与下层内容的混合模式，省略或 normal 为普通叠加',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"lineCap"':
      '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"lineJoin"':
      '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/0/field/"connection"/field/"path"/field/"style"/field/"fillRule"':
      '自交和嵌套路径的填充规则，默认 nonzero；evenodd 按奇偶交叉填充',
    '/union/0/field/"label"': '容器附属标签，通过 position 与 distance 定位',
    '/union/0/field/"items"': '有序单元与结构化分叉；与 data、skeleton 互斥',
    '/union/0/field/"items"/array/union/1/field/"id"': '可选命名引用 id，注册在父命名空间',
    '/union/0/field/"items"/array/union/1/field/"content"': '文字或唯一 drawable，省略时为空单元',
    '/union/0/field/"items"/array/union/1/field/"style"': '集合 单元格的稀疏外观覆盖',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"opacity"': '主要图形整体透明度',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"strokeOpacity"': '轮廓描边透明度',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"lineCap"':
      '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"lineJoin"':
      '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"fill"': '主要图形填充，可使用上下文颜色或画笔',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"fillOpacity"': '填充区域透明度',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
    '/union/0/field/"items"/array/union/1/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
    '/union/0/field/"items"/array/union/1/field/"layout"': '单元尺寸、内边距和溢出的稀疏覆盖',
    '/union/0/field/"items"/array/union/1/field/"layout"/field/"width"':
      '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
    '/union/0/field/"items"/array/union/1/field/"layout"/field/"height"':
      '含内边距的固定边框高度，auto 使用结构的自然尺寸',
    '/union/0/field/"items"/array/union/1/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
    '/union/0/field/"items"/array/union/1/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
    '/union/0/field/"items"/array/union/1/field/"kind"': '单元或并行块的结构判别字段',
    '/union/0/field/"items"/array/union/2/field/"kind"': '单元或并行块的结构判别字段',
    '/union/0/field/"items"/array/union/2/field/"branches"': '至少两条非空有序支路',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"':
      '有序单元与结构化分叉；与 data、skeleton 互斥',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"id"':
      '可选命名引用 id，注册在父命名空间',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"content"':
      '文字或唯一 drawable，省略时为空单元',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"':
      '集合 单元格的稀疏外观覆盖',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"opacity"':
      '主要图形整体透明度',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"stroke"':
      '描边颜色或绘制对象',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"strokeOpacity"':
      '轮廓描边透明度',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"strokeWidth"':
      '描边宽度，使用绘图单位',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"dashPattern"':
      '虚线各段长度，省略为实线',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"dashOffset"':
      '虚线偏移，可为正或负的有限值',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"lineCap"':
      '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"lineJoin"':
      '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"fill"':
      '主要图形填充，可使用上下文颜色或画笔',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"fillOpacity"':
      '填充区域透明度',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"style"/field/"cornerRadius"':
      '大于或等于零的有限数值',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"layout"':
      '单元尺寸、内边距和溢出的稀疏覆盖',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"layout"/field/"width"':
      '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"layout"/field/"height"':
      '含内边距的固定边框高度，auto 使用结构的自然尺寸',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"layout"/field/"padding"':
      '统一或按边设置的非负内边距',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"layout"/field/"overflow"':
      '保留视觉溢出或裁切到单元格分配区域',
    '/union/0/field/"items"/array/union/2/field/"branches"/array/field/"items"/array/union/1/field/"kind"':
      '单元或并行块的结构判别字段',
    '/union/0/field/"items"/array/union/2/field/"layout"': '尺寸和结构排布；并行块仅覆盖结构字段',
    '/union/0/field/"items"/array/union/2/field/"layout"/field/"gap"': '大于零的有限数值',
    '/union/0/field/"items"/array/union/2/field/"layout"/field/"branchGap"': '大于零的有限数值',
    '/union/0/field/"items"/array/union/2/field/"layout"/field/"branchAlign"': '分支包围盒对齐或主干支路下标',
    '/union/0/field/"items"/array/union/2/field/"layout"/field/"branchAlign"/union/1/field/"branch"': '非负安全整数',
    '/union/0/field/"items"/array/union/2/field/"layout"/field/"spacing"': '紧凑序列或共享步骤轨道',
    '/union/0/field/"items"/array/union/2/field/"layout"/field/"justify"': '短支路在公共跨度中的位置',
    '/union/0/field/"items"/array/union/2/field/"connection"': '自动生成连接的局部呈现覆盖',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"route"': '自动正交、直线或显式折角路径',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"':
      'Core Path 的非结构性字段，不允许改写身份和步骤',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"meta"':
      '透传到 Scene 图元的 JSON 元数据，不参与编译语义',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"animations"':
      '原样传递到 Scene 的动画轨道，不影响布局或包围盒，不跨作用域继承',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"zIndex"':
      '同级图元的绘制层级，较大值在上；省略为零，同层按原始顺序',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"roundedCorners"':
      '线段接点的几何圆角半径；省略时保留尖角',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"rotate"':
      '绕路径包围盒中心旋转；先解析端点，再整体应用旋转',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"scale"':
      '绕路径包围盒中心缩放，与旋转使用相同中心',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"scale"/union/1/field/"x"':
      '横轴缩放系数',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"scale"/union/1/field/"y"':
      '纵轴缩放系数',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"label"': '附着于连接路径的标签',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"marks"':
      '按归一化位置放置路径标记，方向沿路径切线',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"':
      '路径外观字段逐项覆盖继承默认值',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"fill"':
      '主要图形填充，可使用上下文颜色或画笔',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"fillOpacity"':
      '填充区域透明度',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"stroke"':
      '描边颜色或绘制对象',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"strokeOpacity"':
      '轮廓描边透明度',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"opacity"':
      '主要图形整体透明度',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"strokeWidth"':
      '描边宽度，使用绘图单位',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"shadow"':
      '主要图形的阴影，可使用预设或显式阴影配置',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"blendMode"':
      '与下层内容的混合模式，省略或 normal 为普通叠加',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"dashPattern"':
      '虚线各段长度，省略为实线',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"dashOffset"':
      '虚线偏移，可为正或负的有限值',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"lineCap"':
      '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"lineJoin"':
      '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/0/field/"items"/array/union/2/field/"connection"/field/"path"/field/"style"/field/"fillRule"':
      '自交和嵌套路径的填充规则，默认 nonzero；evenodd 按奇偶交叉填充',
    '/union/0/field/"data"': '当前输入形式不接受此字段',
    '/union/0/field/"skeleton"': '当前输入形式不接受此字段',
    '/union/0/field/"dataExpand"': '当前输入形式不接受此字段',
    '/union/1/field/"namespace"': 'Standard 复合组件命名空间',
    '/union/1/field/"type"': '串并联内容呈现类型',
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
    '/union/1/field/"defaults"/field/"reset"': '默认样式继承屏障：true 重置全部，或指定 node、path、label、arrow 通道',
    '/union/1/field/"style"': '集合 单元格的稀疏外观覆盖',
    '/union/1/field/"style"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/1/field/"style"/field/"opacity"': '主要图形整体透明度',
    '/union/1/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/1/field/"style"/field/"strokeOpacity"': '轮廓描边透明度',
    '/union/1/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/1/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/1/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/1/field/"style"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/1/field/"style"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/1/field/"style"/field/"fill"': '主要图形填充，可使用上下文颜色或画笔',
    '/union/1/field/"style"/field/"fillOpacity"': '填充区域透明度',
    '/union/1/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/1/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
    '/union/1/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
    '/union/1/field/"layout"': '尺寸和结构排布；并行块仅覆盖结构字段',
    '/union/1/field/"layout"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
    '/union/1/field/"layout"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
    '/union/1/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
    '/union/1/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
    '/union/1/field/"layout"/field/"gap"': '相邻项之间的主轴净间距',
    '/union/1/field/"layout"/field/"branchGap"': '相邻支路包围盒之间的交叉轴净间距',
    '/union/1/field/"layout"/field/"branchAlign"': '整个分支包围盒对齐，或以零基下标选择主干支路',
    '/union/1/field/"layout"/field/"branchAlign"/union/1/field/"branch"': '非负安全整数',
    '/union/1/field/"layout"/field/"spacing"': '各支路独立紧凑排布，或共享直属步骤轨道',
    '/union/1/field/"layout"/field/"justify"': '短支路在公共跨度中的起端、中心或末端位置',
    '/union/1/field/"layout"/field/"direction"': '主链方向：向右或向下',
    '/union/1/field/"connection"': '自动生成连接的局部呈现覆盖',
    '/union/1/field/"connection"/field/"route"': '连接路径策略；auto 在分支块两侧保留公共正交通道',
    '/union/1/field/"connection"/field/"path"': 'Core Path 的非结构性字段，不允许改写身份和步骤',
    '/union/1/field/"connection"/field/"path"/field/"meta"': '透传到 Scene 图元的 JSON 元数据，不参与编译语义',
    '/union/1/field/"connection"/field/"path"/field/"animations"':
      '原样传递到 Scene 的动画轨道，不影响布局或包围盒，不跨作用域继承',
    '/union/1/field/"connection"/field/"path"/field/"zIndex"':
      '同级图元的绘制层级，较大值在上；省略为零，同层按原始顺序',
    '/union/1/field/"connection"/field/"path"/field/"roundedCorners"': '线段接点的几何圆角半径；省略时保留尖角',
    '/union/1/field/"connection"/field/"path"/field/"rotate"': '绕路径包围盒中心旋转；先解析端点，再整体应用旋转',
    '/union/1/field/"connection"/field/"path"/field/"scale"': '绕路径包围盒中心缩放，与旋转使用相同中心',
    '/union/1/field/"connection"/field/"path"/field/"scale"/union/1/field/"x"': '横轴缩放系数',
    '/union/1/field/"connection"/field/"path"/field/"scale"/union/1/field/"y"': '纵轴缩放系数',
    '/union/1/field/"connection"/field/"path"/field/"label"': '附着于连接路径的标签',
    '/union/1/field/"connection"/field/"path"/field/"marks"': '按归一化位置放置路径标记，方向沿路径切线',
    '/union/1/field/"connection"/field/"path"/field/"style"': '路径外观字段逐项覆盖继承默认值',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"fill"': '主要图形填充，可使用上下文颜色或画笔',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"fillOpacity"': '填充区域透明度',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"strokeOpacity"': '轮廓描边透明度',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"opacity"': '主要图形整体透明度',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"shadow"': '主要图形的阴影，可使用预设或显式阴影配置',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"blendMode"':
      '与下层内容的混合模式，省略或 normal 为普通叠加',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"lineCap"':
      '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"lineJoin"':
      '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/1/field/"connection"/field/"path"/field/"style"/field/"fillRule"':
      '自交和嵌套路径的填充规则，默认 nonzero；evenodd 按奇偶交叉填充',
    '/union/1/field/"label"': '容器附属标签，通过 position 与 distance 定位',
    '/union/1/field/"data"': '每个 JSON 值形成线性单元，不推导分支关系',
    '/union/1/field/"items"': '当前输入形式不接受此字段',
    '/union/1/field/"skeleton"': '当前输入形式不接受此字段',
    '/union/1/field/"dataExpand"':
      '非空对象值的展示方式：map 递归绘制，text 显示紧凑 JSON 文本；默认 map，根对象仍是 Map',
    '/union/2/field/"namespace"': 'Standard 复合组件命名空间',
    '/union/2/field/"type"': '串并联内容呈现类型',
    '/union/2/field/"frame"': '绘制在容器内容下方的可选外框',
    '/union/2/field/"theme"': '由后代继承的稀疏主题覆盖',
    '/union/2/field/"id"': '可选命名引用 id，注册在父命名空间',
    '/union/2/field/"localNamespace"': '将后代节点、坐标及嵌套作用域的 id 限定在本地；容器自身 id 仍注册在父命名空间',
    '/union/2/field/"transforms"': '作用于全部内容的局部变换，数组末项先作用；平移在编译时展开',
    '/union/2/field/"placement"': '内在布局与局部变换后的最终放置方式',
    '/union/2/field/"zIndex"': '容器整体在同级图元中的堆叠顺序，不控制内部子图元',
    '/union/2/field/"clip"': '容器局部坐标中的整体裁切区域',
    '/union/2/field/"boundingShape"': '命名引用使用的包围轮廓：矩形或圆形',
    '/union/2/field/"meta"': '保留到 Scene 的 JSON 元数据，编译器不解释其内容',
    '/union/2/field/"animations"': '作用于容器整体的动画轨道，不影响布局，也不向子图元传播',
    '/union/2/field/"defaults"': '后代默认样式及其继承屏障',
    '/union/2/field/"defaults"/field/"node"': '节点默认样式，与其他通道独立',
    '/union/2/field/"defaults"/field/"path"': '路径类图元的默认样式；箭头使用 defaults.arrow',
    '/union/2/field/"defaults"/field/"label"': '节点标签与路径步骤标签的默认样式',
    '/union/2/field/"defaults"/field/"arrow"': '箭头默认样式',
    '/union/2/field/"defaults"/field/"reset"': '默认样式继承屏障：true 重置全部，或指定 node、path、label、arrow 通道',
    '/union/2/field/"style"': '集合 单元格的稀疏外观覆盖',
    '/union/2/field/"style"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/2/field/"style"/field/"opacity"': '主要图形整体透明度',
    '/union/2/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/2/field/"style"/field/"strokeOpacity"': '轮廓描边透明度',
    '/union/2/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/2/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/2/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/2/field/"style"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/2/field/"style"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/2/field/"style"/field/"fill"': '主要图形填充，可使用上下文颜色或画笔',
    '/union/2/field/"style"/field/"fillOpacity"': '填充区域透明度',
    '/union/2/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/2/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
    '/union/2/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
    '/union/2/field/"layout"': '尺寸和结构排布；并行块仅覆盖结构字段',
    '/union/2/field/"layout"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
    '/union/2/field/"layout"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
    '/union/2/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
    '/union/2/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
    '/union/2/field/"layout"/field/"gap"': '相邻项之间的主轴净间距',
    '/union/2/field/"layout"/field/"branchGap"': '相邻支路包围盒之间的交叉轴净间距',
    '/union/2/field/"layout"/field/"branchAlign"': '整个分支包围盒对齐，或以零基下标选择主干支路',
    '/union/2/field/"layout"/field/"branchAlign"/union/1/field/"branch"': '非负安全整数',
    '/union/2/field/"layout"/field/"spacing"': '各支路独立紧凑排布，或共享直属步骤轨道',
    '/union/2/field/"layout"/field/"justify"': '短支路在公共跨度中的起端、中心或末端位置',
    '/union/2/field/"layout"/field/"direction"': '主链方向：向右或向下',
    '/union/2/field/"connection"': '自动生成连接的局部呈现覆盖',
    '/union/2/field/"connection"/field/"route"': '连接路径策略；auto 在分支块两侧保留公共正交通道',
    '/union/2/field/"connection"/field/"path"': 'Core Path 的非结构性字段，不允许改写身份和步骤',
    '/union/2/field/"connection"/field/"path"/field/"meta"': '透传到 Scene 图元的 JSON 元数据，不参与编译语义',
    '/union/2/field/"connection"/field/"path"/field/"animations"':
      '原样传递到 Scene 的动画轨道，不影响布局或包围盒，不跨作用域继承',
    '/union/2/field/"connection"/field/"path"/field/"zIndex"':
      '同级图元的绘制层级，较大值在上；省略为零，同层按原始顺序',
    '/union/2/field/"connection"/field/"path"/field/"roundedCorners"': '线段接点的几何圆角半径；省略时保留尖角',
    '/union/2/field/"connection"/field/"path"/field/"rotate"': '绕路径包围盒中心旋转；先解析端点，再整体应用旋转',
    '/union/2/field/"connection"/field/"path"/field/"scale"': '绕路径包围盒中心缩放，与旋转使用相同中心',
    '/union/2/field/"connection"/field/"path"/field/"scale"/union/1/field/"x"': '横轴缩放系数',
    '/union/2/field/"connection"/field/"path"/field/"scale"/union/1/field/"y"': '纵轴缩放系数',
    '/union/2/field/"connection"/field/"path"/field/"label"': '附着于连接路径的标签',
    '/union/2/field/"connection"/field/"path"/field/"marks"': '按归一化位置放置路径标记，方向沿路径切线',
    '/union/2/field/"connection"/field/"path"/field/"style"': '路径外观字段逐项覆盖继承默认值',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"fill"': '主要图形填充，可使用上下文颜色或画笔',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"fillOpacity"': '填充区域透明度',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"strokeOpacity"': '轮廓描边透明度',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"opacity"': '主要图形整体透明度',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"shadow"': '主要图形的阴影，可使用预设或显式阴影配置',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"blendMode"':
      '与下层内容的混合模式，省略或 normal 为普通叠加',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"lineCap"':
      '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"lineJoin"':
      '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/2/field/"connection"/field/"path"/field/"style"/field/"fillRule"':
      '自交和嵌套路径的填充规则，默认 nonzero；evenodd 按奇偶交叉填充',
    '/union/2/field/"label"': '容器附属标签，通过 position 与 distance 定位',
    '/union/2/field/"skeleton"': 'count、labels、递归 items 三选一的符号骨架',
    '/union/2/field/"skeleton"/union/0/field/"count"': '非负安全整数',
    '/union/2/field/"skeleton"/union/0/field/"labels"': '当前输入形式不接受此字段',
    '/union/2/field/"skeleton"/union/0/field/"items"': '当前输入形式不接受此字段',
    '/union/2/field/"skeleton"/union/1/field/"labels"': '线性符号，空字符串保留空单元',
    '/union/2/field/"skeleton"/union/1/field/"count"': '当前输入形式不接受此字段',
    '/union/2/field/"skeleton"/union/1/field/"items"': '当前输入形式不接受此字段',
    '/union/2/field/"skeleton"/union/2/field/"items"': '有序单元与结构化分叉；与 data、skeleton 互斥',
    '/union/2/field/"skeleton"/union/2/field/"items"/array/union/1/field/"branches"': '至少两条非空有序支路',
    '/union/2/field/"skeleton"/union/2/field/"count"': '当前输入形式不接受此字段',
    '/union/2/field/"skeleton"/union/2/field/"labels"': '当前输入形式不接受此字段',
    '/union/2/field/"items"': '当前输入形式不接受此字段',
    '/union/2/field/"data"': '当前输入形式不接受此字段',
    '/union/2/field/"dataExpand"': '当前输入形式不接受此字段',
  },
};
