/** Matrix 字段的中文说明，路径对应持久化 Schema */
export const matrixSchemaLocalization = {
  description: '矩形单元格、JSON 数据或示意骨架',
  descriptions: {
    '/union/0/field/"namespace"': 'Standard 复合组件命名空间',
    '/union/0/field/"type"': '矩形单元格呈现类型',
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
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"fill"': '填充颜色或绘制对象',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"strokeOpacity"': '仅描边透明度',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"opacity"': '单元格整体透明度',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/0/field/"defaults"/field/"node"/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
    '/union/0/field/"defaults"/field/"node"/field/"layout"/field/"minimumSize"/union/0': '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"node"/field/"layout"/field/"padding"/union/0': '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"node"/field/"layout"/field/"margin"/union/0': '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"path"': '路径类图元的默认样式；箭头使用 defaults.arrow',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"fill"': '填充颜色或绘制对象',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"strokeOpacity"': '仅描边透明度',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"opacity"': '单元格整体透明度',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"lineCap"':
      '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/0/field/"defaults"/field/"path"/field/"style"/field/"lineJoin"':
      '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/0/field/"defaults"/field/"label"': '节点标签与路径步骤标签的默认样式',
    '/union/0/field/"defaults"/field/"arrow"': '箭头默认样式',
    '/union/0/field/"defaults"/field/"reset"': '默认样式继承屏障：true 重置全部，或指定 node、path、label、arrow 通道',
    '/union/0/field/"style"': '集合 单元格的稀疏外观覆盖',
    '/union/0/field/"style"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"style"/field/"opacity"': '单元格整体透明度',
    '/union/0/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/0/field/"style"/field/"stroke"/union/1/union/3/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/0/field/"style"/field/"stroke"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"style"/field/"stroke"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"style"/field/"stroke"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"style"/field/"strokeOpacity"': '仅描边透明度',
    '/union/0/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/0/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/0/field/"style"/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/0/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/0/field/"style"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/0/field/"style"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/0/field/"style"/field/"fill"': '填充颜色或绘制对象',
    '/union/0/field/"style"/field/"fill"/union/1/union/3/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/0/field/"style"/field/"fill"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"style"/field/"fill"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"style"/field/"fill"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
    '/union/0/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/0/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
    '/union/0/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
    '/union/0/field/"layout"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
    '/union/0/field/"layout"/field/"width"/union/0': '大于或等于零的有限数值',
    '/union/0/field/"layout"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
    '/union/0/field/"layout"/field/"height"/union/0': '大于或等于零的有限数值',
    '/union/0/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
    '/union/0/field/"layout"/field/"padding"/union/0': '大于或等于零的有限数值',
    '/union/0/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
    '/union/0/field/"layout"/field/"gap"': '统一间距，或分别设置行、列间距',
    '/union/0/field/"layout"/field/"gap"/union/1/field/"row"': '大于或等于零的有限数值',
    '/union/0/field/"layout"/field/"gap"/union/1/field/"column"': '大于或等于零的有限数值',
    '/union/0/field/"label"': '容器附属标签，通过 position 与 distance 定位',
    '/union/0/field/"index"': 'false 隐藏两轴，true 启用两轴，对象分别配置两轴',
    '/union/0/field/"index"/union/1/field/"row"': '左右侧的行索引，省略则隐藏',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/0/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/0/field/"start"':
      '显示索引的非负整数起点，不作为单元格身份',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/0/field/"labels"': '此输入分支不接受该字段',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/1/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/1/field/"labels"':
      '格外纯文本标号，数量与格数一致；空字符串隐藏该标号',
    '/union/0/field/"index"/union/1/field/"row"/union/1/union/1/field/"start"': '此输入分支不接受该字段',
    '/union/0/field/"index"/union/1/field/"column"': '上下侧的列索引，省略则隐藏',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/0/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/0/field/"start"':
      '显示索引的非负整数起点，不作为单元格身份',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/0/field/"labels"': '此输入分支不接受该字段',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/1/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/1/field/"labels"':
      '格外纯文本标号，数量与格数一致；空字符串隐藏该标号',
    '/union/0/field/"index"/union/1/field/"column"/union/1/union/1/field/"start"': '此输入分支不接受该字段',
    '/union/0/field/"cellIdMode"': '显式单格 id，或由 Matrix id 与零基行列坐标生成 id',
    '/union/0/field/"items"': '行列对齐的显式单元格',
    '/union/0/field/"items"/array/array/union/1/field/"id"': '可选命名引用 id，注册在父命名空间',
    '/union/0/field/"items"/array/array/union/1/field/"style"': '集合 单元格的稀疏外观覆盖',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"opacity"': '单元格整体透明度',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"stroke"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"stroke"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"stroke"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"stroke"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"strokeOpacity"': '仅描边透明度',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"lineCap"':
      '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"lineJoin"':
      '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"fill"': '填充颜色或绘制对象',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"fill"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"fill"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"fill"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"fill"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
    '/union/0/field/"items"/array/array/union/1/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"layout"/field/"width"':
      '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
    '/union/0/field/"items"/array/array/union/1/field/"layout"/field/"width"/union/0': '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"layout"/field/"height"':
      '含内边距的固定边框高度，auto 使用结构的自然尺寸',
    '/union/0/field/"items"/array/array/union/1/field/"layout"/field/"height"/union/0': '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
    '/union/0/field/"items"/array/array/union/1/field/"layout"/field/"padding"/union/0': '大于或等于零的有限数值',
    '/union/0/field/"items"/array/array/union/1/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
    '/union/0/field/"data"': '显式单元格入口不接受此字段',
    '/union/0/field/"skeleton"': '显式单元格入口不接受此字段',
    '/union/0/field/"dataExpand"': '仅用于 JSON 数据入口',
    '/union/1/field/"namespace"': 'Standard 复合组件命名空间',
    '/union/1/field/"type"': '矩形单元格呈现类型',
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
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"fill"': '填充颜色或绘制对象',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"strokeOpacity"': '仅描边透明度',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"opacity"': '单元格整体透明度',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/1/field/"defaults"/field/"node"/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
    '/union/1/field/"defaults"/field/"node"/field/"layout"/field/"minimumSize"/union/0': '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"node"/field/"layout"/field/"padding"/union/0': '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"node"/field/"layout"/field/"margin"/union/0': '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"path"': '路径类图元的默认样式；箭头使用 defaults.arrow',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"fill"': '填充颜色或绘制对象',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"strokeOpacity"': '仅描边透明度',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"opacity"': '单元格整体透明度',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"lineCap"':
      '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/1/field/"defaults"/field/"path"/field/"style"/field/"lineJoin"':
      '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/1/field/"defaults"/field/"label"': '节点标签与路径步骤标签的默认样式',
    '/union/1/field/"defaults"/field/"arrow"': '箭头默认样式',
    '/union/1/field/"defaults"/field/"reset"': '默认样式继承屏障：true 重置全部，或指定 node、path、label、arrow 通道',
    '/union/1/field/"style"': '集合 单元格的稀疏外观覆盖',
    '/union/1/field/"style"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/1/field/"style"/field/"opacity"': '单元格整体透明度',
    '/union/1/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/1/field/"style"/field/"stroke"/union/1/union/3/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/1/field/"style"/field/"stroke"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"style"/field/"stroke"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"style"/field/"stroke"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"style"/field/"strokeOpacity"': '仅描边透明度',
    '/union/1/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/1/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/1/field/"style"/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/1/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/1/field/"style"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/1/field/"style"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/1/field/"style"/field/"fill"': '填充颜色或绘制对象',
    '/union/1/field/"style"/field/"fill"/union/1/union/3/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/1/field/"style"/field/"fill"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"style"/field/"fill"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"style"/field/"fill"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/1/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
    '/union/1/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/1/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
    '/union/1/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
    '/union/1/field/"layout"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
    '/union/1/field/"layout"/field/"width"/union/0': '大于或等于零的有限数值',
    '/union/1/field/"layout"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
    '/union/1/field/"layout"/field/"height"/union/0': '大于或等于零的有限数值',
    '/union/1/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
    '/union/1/field/"layout"/field/"padding"/union/0': '大于或等于零的有限数值',
    '/union/1/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
    '/union/1/field/"layout"/field/"gap"': '统一间距，或分别设置行、列间距',
    '/union/1/field/"layout"/field/"gap"/union/1/field/"row"': '大于或等于零的有限数值',
    '/union/1/field/"layout"/field/"gap"/union/1/field/"column"': '大于或等于零的有限数值',
    '/union/1/field/"label"': '容器附属标签，通过 position 与 distance 定位',
    '/union/1/field/"index"': 'false 隐藏两轴，true 启用两轴，对象分别配置两轴',
    '/union/1/field/"index"/union/1/field/"row"': '左右侧的行索引，省略则隐藏',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/0/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/0/field/"start"':
      '显示索引的非负整数起点，不作为单元格身份',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/0/field/"labels"': '此输入分支不接受该字段',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/1/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/1/field/"labels"':
      '格外纯文本标号，数量与格数一致；空字符串隐藏该标号',
    '/union/1/field/"index"/union/1/field/"row"/union/1/union/1/field/"start"': '此输入分支不接受该字段',
    '/union/1/field/"index"/union/1/field/"column"': '上下侧的列索引，省略则隐藏',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/0/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/0/field/"start"':
      '显示索引的非负整数起点，不作为单元格身份',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/0/field/"labels"': '此输入分支不接受该字段',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/1/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/1/field/"labels"':
      '格外纯文本标号，数量与格数一致；空字符串隐藏该标号',
    '/union/1/field/"index"/union/1/field/"column"/union/1/union/1/field/"start"': '此输入分支不接受该字段',
    '/union/1/field/"cellIdMode"': '显式单格 id，或由 Matrix id 与零基行列坐标生成 id',
    '/union/1/field/"data"': '矩形 JSON 行；格内内容作为数据展示',
    '/union/1/field/"items"': 'JSON 数据入口不接受此字段',
    '/union/1/field/"skeleton"': 'JSON 数据入口不接受此字段',
    '/union/1/field/"dataExpand"':
      '非空对象值的展示方式：map 递归绘制，text 显示紧凑 JSON 文本；默认 map，根对象仍是 Map',
    '/union/2/field/"namespace"': 'Standard 复合组件命名空间',
    '/union/2/field/"type"': '矩形单元格呈现类型',
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
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"fill"': '填充颜色或绘制对象',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"fill"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"stroke"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"strokeOpacity"': '仅描边透明度',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"opacity"': '单元格整体透明度',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/2/field/"defaults"/field/"node"/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
    '/union/2/field/"defaults"/field/"node"/field/"layout"/field/"minimumSize"/union/0': '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"node"/field/"layout"/field/"padding"/union/0': '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"node"/field/"layout"/field/"margin"/union/0': '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"path"': '路径类图元的默认样式；箭头使用 defaults.arrow',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"fill"': '填充颜色或绘制对象',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"fill"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"stroke"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"strokeOpacity"': '仅描边透明度',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"opacity"': '单元格整体透明度',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"lineCap"':
      '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/2/field/"defaults"/field/"path"/field/"style"/field/"lineJoin"':
      '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/2/field/"defaults"/field/"label"': '节点标签与路径步骤标签的默认样式',
    '/union/2/field/"defaults"/field/"arrow"': '箭头默认样式',
    '/union/2/field/"defaults"/field/"reset"': '默认样式继承屏障：true 重置全部，或指定 node、path、label、arrow 通道',
    '/union/2/field/"style"': '集合 单元格的稀疏外观覆盖',
    '/union/2/field/"style"/field/"color"': '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/2/field/"style"/field/"opacity"': '单元格整体透明度',
    '/union/2/field/"style"/field/"stroke"': '描边颜色或绘制对象',
    '/union/2/field/"style"/field/"stroke"/union/1/union/3/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/2/field/"style"/field/"stroke"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"style"/field/"stroke"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"style"/field/"stroke"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"style"/field/"strokeOpacity"': '仅描边透明度',
    '/union/2/field/"style"/field/"strokeWidth"': '描边宽度，使用绘图单位',
    '/union/2/field/"style"/field/"dashPattern"': '虚线各段长度，省略为实线',
    '/union/2/field/"style"/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/2/field/"style"/field/"dashOffset"': '虚线偏移，可为正或负的有限值',
    '/union/2/field/"style"/field/"lineCap"': '线端样式，省略为 butt；round 为半圆，square 向端外延伸',
    '/union/2/field/"style"/field/"lineJoin"': '折角样式，省略为 miter；round 圆角，bevel 切角',
    '/union/2/field/"style"/field/"fill"': '填充颜色或绘制对象',
    '/union/2/field/"style"/field/"fill"/union/1/union/3/field/"dashPattern"/array': '大于或等于零的有限数值',
    '/union/2/field/"style"/field/"fill"/union/1/union/3/field/"horizontalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"style"/field/"fill"/union/1/union/3/field/"verticalStyle"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"style"/field/"fill"/union/1/union/3/field/"lineStyleCycle"/field/"overrides"/array/field/"style"/field/"dashPattern"/array':
      '大于或等于零的有限数值',
    '/union/2/field/"style"/field/"fillOpacity"': '仅背景填充透明度',
    '/union/2/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/2/field/"style"/field/"font"': '内容文字的字体设置，省略字段沿用文字默认',
    '/union/2/field/"style"/field/"cornerRadius"': '大于或等于零的有限数值',
    '/union/2/field/"layout"/field/"width"': '含内边距的固定边框宽度，auto 使用结构的自然尺寸',
    '/union/2/field/"layout"/field/"width"/union/0': '大于或等于零的有限数值',
    '/union/2/field/"layout"/field/"height"': '含内边距的固定边框高度，auto 使用结构的自然尺寸',
    '/union/2/field/"layout"/field/"height"/union/0': '大于或等于零的有限数值',
    '/union/2/field/"layout"/field/"padding"': '统一或按边设置的非负内边距',
    '/union/2/field/"layout"/field/"padding"/union/0': '大于或等于零的有限数值',
    '/union/2/field/"layout"/field/"overflow"': '保留视觉溢出或裁切到单元格分配区域',
    '/union/2/field/"layout"/field/"gap"': '统一间距，或分别设置行、列间距',
    '/union/2/field/"layout"/field/"gap"/union/1/field/"row"': '大于或等于零的有限数值',
    '/union/2/field/"layout"/field/"gap"/union/1/field/"column"': '大于或等于零的有限数值',
    '/union/2/field/"label"': '容器附属标签，通过 position 与 distance 定位',
    '/union/2/field/"index"': 'false 隐藏两轴，true 启用两轴，对象分别配置两轴',
    '/union/2/field/"index"/union/1/field/"row"': '左右侧的行索引，省略则隐藏',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/0/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/0/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/0/field/"start"':
      '显示索引的非负整数起点，不作为单元格身份',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/0/field/"labels"': '此输入分支不接受该字段',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/1/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/1/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/1/field/"labels"':
      '格外纯文本标号，数量与格数一致；空字符串隐藏该标号',
    '/union/2/field/"index"/union/1/field/"row"/union/1/union/1/field/"start"': '此输入分支不接受该字段',
    '/union/2/field/"index"/union/1/field/"column"': '上下侧的列索引，省略则隐藏',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/0/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/0/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/0/field/"start"':
      '显示索引的非负整数起点，不作为单元格身份',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/0/field/"labels"': '此输入分支不接受该字段',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/1/field/"position"':
      'before 为横排上方或竖排左侧，after 为横排下方或竖排右侧',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"':
      '索引文本样式，字体按字段继承整体字体，不受单格样式影响',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"textColor"':
      '文字颜色；数字由有效主色派生，contrast 根据静态填充选黑或白，默认 currentColor',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"font"':
      '内容文字的字体设置，省略字段沿用文字默认',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"color"':
      '主色，描边、填充、标签与箭头可继承，独立设置优先',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/1/field/"style"/field/"opacity"': '索引文字透明度',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/1/field/"labels"':
      '格外纯文本标号，数量与格数一致；空字符串隐藏该标号',
    '/union/2/field/"index"/union/1/field/"column"/union/1/union/1/field/"start"': '此输入分支不接受该字段',
    '/union/2/field/"cellIdMode"': '显式单格 id，或由 Matrix id 与零基行列坐标生成 id',
    '/union/2/field/"skeleton"': '不依赖真实数据的示意矩形',
    '/union/2/field/"skeleton"/union/0/field/"rows"': '非负安全整数行数',
    '/union/2/field/"skeleton"/union/0/field/"columns"': '非负安全整数列数',
    '/union/2/field/"skeleton"/union/0/field/"labels"': '显式行列数量入口不接受此字段',
    '/union/2/field/"skeleton"/union/1/field/"labels"': '矩形格内文字；空字符串表示无内容',
    '/union/2/field/"skeleton"/union/1/field/"rows"': '由二维标号推导，不接受显式数量',
    '/union/2/field/"skeleton"/union/1/field/"columns"': '由二维标号推导，不接受显式数量',
    '/union/2/field/"items"': '示意骨架入口不接受此字段',
    '/union/2/field/"data"': '示意骨架入口不接受此字段',
    '/union/2/field/"dataExpand"': '仅用于 JSON 数据入口',
  },
};
