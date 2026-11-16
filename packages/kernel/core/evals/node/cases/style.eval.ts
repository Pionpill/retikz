import type { NodeEvalCase } from '../suite';

/** 视觉样式 */
export const styleCases: Array<NodeEvalCase> = [
  {
    id: 'NE001',
    task: '节点主色为 #336699，只将填充单独改为 #ffcc00，描边和正文色继续继承，不重置。',
    expected: {
      type: 'node',
      style: {
        color: '#336699',
        fill: '#ffcc00',
      },
    },
    mustOmit: ['style.stroke', 'style.textColor', 'style.font'],
  },
  {
    id: 'NE002',
    task: '节点主色为 #336699；填充颜色用主色的 0.25 权重，描边颜色用主色的 0.75 权重。不要改变任何不透明度。',
    expected: {
      type: 'node',
      style: {
        color: '#336699',
        fill: 0.25,
        stroke: 0.75,
      },
    },
    mustOmit: ['style.opacity'],
    counterexample: {
      expected: {
        type: 'node',
        style: {
          color: '#336699',
          opacity: {
            fill: 0.25,
            stroke: 0.75,
          },
        },
      },
      reason: '将颜色权重误当不透明度分量',
    },
  },
  {
    id: 'NE003',
    task: '节点填充为 #ffffff，正文为“对比”；正文颜色交给契约的自动黑白对比机制，不能硬编码黑色或修改填充。',
    expected: {
      type: 'node',
      style: {
        fill: '#ffffff',
        textColor: 'contrast',
      },
      text: '对比',
    },
  },
  {
    id: 'NE004',
    task: '节点主色 #336699，正文颜色采用有效节点主色的 0.4 权重，不改变文字透明度。',
    expected: {
      type: 'node',
      style: {
        color: '#336699',
        textColor: 0.4,
      },
    },
    mustOmit: ['style.opacity'],
  },
  {
    id: 'NE005',
    task: '把节点主体整体设为 40% 不透明度，填充和描边都随之衰减，不单独指定它们的因子。',
    expected: {
      type: 'node',
      style: {
        opacity: 0.4,
      },
    },
  },
  {
    id: 'NE006',
    task: '同时保留三个透明度配置事实：主体整体为 50%，填充相对整体为 40%，描边相对整体为 80%。不要预先把分量乘成结果值。',
    expected: {
      type: 'node',
      style: {
        opacity: {
          overall: 0.5,
          fill: 0.4,
          stroke: 0.8,
        },
      },
    },
    counterexample: {
      expected: {
        type: 'node',
        style: {
          opacity: {
            overall: 0.5,
            fill: 0.2,
            stroke: 0.4,
          },
        },
      },
      reason: '把有效结果误当分量再次参与乘法；配置合法但结果被重复衰减',
    },
  },
  {
    id: 'NE007',
    task: '只把填充的不透明度因子覆盖为 0；整体和描边继续继承，不能被设为 0 或 1。',
    expected: {
      type: 'node',
      style: {
        opacity: {
          fill: 0,
        },
      },
    },
    mustOmit: ['style.opacity.overall', 'style.opacity.stroke'],
    counterexample: {
      expected: {
        type: 'node',
        style: {
          opacity: 0,
        },
      },
      reason: '把仅填充透明误作整个主体透明；结构合法但误改整体/描边',
    },
  },
  {
    id: 'NE008',
    task: '节点用蓝色描边，但描边宽度显式设为 0；不要用透明色或整节点透明来替代。',
    expected: {
      type: 'node',
      style: {
        stroke: 'blue',
        strokeWidth: 0,
      },
    },
    mustOmit: ['style.opacity'],
  },
  {
    id: 'NE009',
    task: '节点描边宽 3 个用户单位，端点精确停在线段端点，转角保留尖角。',
    expected: {
      type: 'node',
      style: {
        strokeWidth: 3,
        lineCap: 'butt',
        lineJoin: 'miter',
      },
    },
  },
  {
    id: 'NE010',
    task: '节点描边宽 3 个用户单位，端点用半圆，转角也圆润。',
    expected: {
      type: 'node',
      style: {
        strokeWidth: 3,
        lineCap: 'round',
        lineJoin: 'round',
      },
    },
  },
  {
    id: 'NE011',
    task: '节点描边宽 3 个用户单位，端点向外延伸形成方头，尖角削平。',
    expected: {
      type: 'node',
      style: {
        strokeWidth: 3,
        lineCap: 'square',
        lineJoin: 'bevel',
      },
    },
  },
  {
    id: 'NE012',
    task: '保留描边的两个快捷开关都为开启，同时显式指定重复线段长 8、空隙长 3，整体相位偏移 -2 个用户单位；显式序列决定最终线型。',
    expected: {
      type: 'node',
      style: {
        dashed: true,
        dotted: true,
        dashPattern: [8, 3],
        dashOffset: -2,
      },
    },
  },
  {
    id: 'NE013',
    task: '保留描边虚线和点线两个快捷开关都开启，不给显式线段序列；最终应使用虚线快捷设置。',
    expected: {
      type: 'node',
      style: {
        dashed: true,
        dotted: true,
      },
    },
    mustOmit: ['style.dashPattern'],
  },
  {
    id: 'NE014',
    task: '节点边框使用点线快捷设置，不使用虚线快捷设置或自定义序列。',
    expected: {
      type: 'node',
      style: {
        dotted: true,
      },
    },
    mustOmit: ['style.dashPattern'],
  },
  {
    id: 'NE015',
    task: '父作用域已经提供描边、字体和填充默认值；当前节点只覆盖描边宽度为 2，其余配置保持继承，不物化默认值。',
    expected: {
      type: 'node',
      style: {
        strokeWidth: 2,
      },
    },
    mustOmit: ['style.fill', 'style.stroke', 'style.font', 'style.lineCap'],
  },
  {
    id: 'NE016',
    task: '节点主体使用中等阴影预设，不展开成具体偏移、模糊或颜色。',
    expected: {
      type: 'node',
      style: {
        shadow: 'md',
      },
    },
  },
  {
    id: 'NE017',
    task: '节点主体使用禁用阴影预设，不展开成具体偏移、模糊或颜色。',
    expected: {
      type: 'node',
      style: {
        shadow: 'none',
      },
    },
  },
  {
    id: 'NE018',
    task: '使用 md 阴影预设，只把横向偏移覆盖为 -3、纵向偏移为 5、模糊半径为 0、颜色为 #112233，再给阴影本身乘 0.4 不透明度。',
    expected: {
      type: 'node',
      style: {
        shadow: {
          preset: 'md',
          offsetX: -3,
          offsetY: 5,
          blur: 0,
          color: '#112233',
          opacity: 0.4,
        },
      },
    },
  },
  {
    id: 'NE019',
    task: '不使用阴影预设，直接给主体设置向右 4、向下 6 的阴影，模糊半径 8；颜色不覆盖，沿用显式阴影的默认半透明黑色。',
    expected: {
      type: 'node',
      style: {
        shadow: {
          offsetX: 4,
          offsetY: 6,
          blur: 8,
        },
      },
    },
    mustOmit: ['style.shadow.color', 'style.shadow.preset'],
  },
  {
    id: 'NE020',
    task: '主体与其下方已经绘制的内容采用正片叠底混合，不能把它当作阴影或透明度。',
    expected: {
      type: 'node',
      style: {
        blendMode: 'multiply',
      },
    },
  },
  {
    id: 'NE021',
    task: '将主体的混合模式显式设为普通 source-over，以覆盖可能继承的其他混合模式。',
    expected: {
      type: 'node',
      style: {
        blendMode: 'normal',
      },
    },
  },
];
