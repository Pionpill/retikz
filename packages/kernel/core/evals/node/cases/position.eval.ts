import type { NodeEvalCase } from '../suite';

/** 定位 */
export const positionCases: Array<NodeEvalCase> = [
  {
    id: 'NC001',
    task: '在当前局部坐标系中，把节点中心放在原点右侧 24、下方 18 个用户单位。',
    expected: {
      type: 'node',
      position: [24, 18],
    },
    counterexample: {
      expected: {
        type: 'node',
        position: [24, -18],
      },
      reason: '向下误写为负 y；Zod 仍合法，但方向断言必须拒绝',
    },
  },
  {
    id: 'NC002',
    task: '用极坐标表达节点位置：以局部原点为圆心，沿正 x 轴顺屏幕方向转 90 度，距离 40 个用户单位。保留极坐标，不展开为笛卡尔数值。',
    expected: {
      type: 'node',
      position: {
        angle: 90,
        radius: 40,
      },
    },
  },
  {
    id: 'NC003',
    task: '用极坐标定位，原点是已定义的 hub 节点，从该原点沿 0 度方向距离 25。保留原点引用和极坐标层级。',
    expected: {
      type: 'node',
      position: {
        origin: 'hub',
        angle: 0,
        radius: 25,
      },
    },
  },
  {
    id: 'NC004',
    task: '用极坐标定位，原点是局部坐标 [10,20]，从该原点沿 0 度方向距离 25。保留原点引用和极坐标层级。',
    expected: {
      type: 'node',
      position: {
        origin: [10, 20],
        angle: 0,
        radius: 25,
      },
    },
  },
  {
    id: 'NC005',
    task: '用极坐标定位，原点是以局部原点为中心、顺屏幕正方向 90 度距离 10 的另一个极坐标点，从该原点沿 0 度方向距离 25。保留原点引用和极坐标层级。',
    expected: {
      type: 'node',
      position: {
        origin: {
          angle: 90,
          radius: 10,
        },
        angle: 0,
        radius: 25,
      },
    },
  },
  {
    id: 'NC006',
    task: 'A 已经完成布局。将新节点放在 A 的右上方，两个节点中心相距 60 个用户单位；保留相对引用。',
    expected: {
      type: 'node',
      position: {
        of: 'A',
        direction: 'top-right',
        distance: 60,
      },
    },
  },
  {
    id: 'NC007',
    task: 'A 已完成布局。新节点位于 A 左侧，距离沿用宿主的默认节点间距，不填固定距离。',
    expected: {
      type: 'node',
      position: {
        of: 'A',
        direction: 'left',
      },
    },
    mustOmit: ['position.distance'],
  },
  {
    id: 'NC008',
    task: '以已布局节点 A 为基点，从其中心向右偏移 12、向上偏移 5 个用户单位放置新节点。保留对 A 的引用和这段位移，不使用锚点对齐。',
    expected: {
      type: 'node',
      position: {
        of: 'A',
        offset: [12, -5],
      },
    },
  },
  {
    id: 'NC009',
    task: '以坐标 [10,20]为基点，向右 12、向上 5 个用户单位放置节点；保留基点和偏移表达。',
    expected: {
      type: 'node',
      position: {
        of: [10, 20],
        offset: [12, -5],
      },
    },
  },
  {
    id: 'NC010',
    task: '以以局部原点为中心、90 度距离 20 的极坐标点为基点，向右 12、向上 5 个用户单位放置节点；保留基点和偏移表达。',
    expected: {
      type: 'node',
      position: {
        of: {
          angle: 90,
          radius: 20,
        },
        offset: [12, -5],
      },
    },
  },
  {
    id: 'NC011',
    task: '将节点放在从 [0,0] 走向 [80,40] 的四分之一处，保留两端点和比例表达。',
    expected: {
      type: 'node',
      position: {
        between: [
          [0, 0],
          [80, 40],
        ],
        fraction: 0.25,
      },
    },
  },
  {
    id: 'NC012',
    task: 'A、B 已布局。第一个端点是 A 的右侧边界；第二个端点是 B 中心与 [100,0] 的中点。在第一端点到第二端点的 75% 处放置节点，保留所有引用和嵌套关系。',
    expected: {
      type: 'node',
      position: {
        between: [
          {
            id: 'A',
            anchor: 'right',
          },
          {
            between: [
              {
                id: 'B',
              },
              [100, 0],
            ],
            fraction: 0.5,
          },
        ],
        fraction: 0.75,
      },
    },
  },
  {
    id: 'NC013',
    task: '保留复合定位：起点是极坐标 0 度距离 10；终点是 [30,40] 再偏移 [2,-3]；从起点走到终点的 60% 处放置节点。',
    expected: {
      type: 'node',
      position: {
        between: [
          {
            angle: 0,
            radius: 10,
          },
          {
            of: [30, 40],
            offset: [2, -3],
          },
        ],
        fraction: 0.6,
      },
    },
  },
  {
    id: 'NC014',
    task: 'A 已布局。将当前节点的左侧锚点与 A 的右侧锚点重合，保留锚点对齐关系。',
    expected: {
      type: 'node',
      position: {
        kind: 'anchor',
        target: {
          id: 'A',
          anchor: 'right',
        },
        selfAnchor: 'left',
      },
    },
    counterexample: {
      expected: {
        type: 'node',
        position: {
          kind: 'anchor',
          target: {
            id: 'A',
            anchor: 'left',
          },
          selfAnchor: 'right',
        },
      },
      reason: 'target/self 锚点互换；结构合法但对齐对象错误',
    },
  },
  {
    id: 'NC015',
    task: 'A 已布局。使用锚点对齐方式，使新节点的中心与 A 的中心重合。保留引用；不计算 A 的坐标。',
    expected: {
      type: 'node',
      position: {
        kind: 'anchor',
        target: {
          id: 'A',
        },
      },
    },
  },
  {
    id: 'NC016',
    task: 'A 已布局。连接表面临时改为圆形，取它朝 90 度方向的边界点，再加世界坐标偏移 [5,-2]；将当前节点中心对齐到该点，A 的默认边界不要被改写。',
    expected: {
      type: 'node',
      position: {
        kind: 'anchor',
        target: {
          id: 'A',
          anchor: 90,
          boundary: 'circle',
          offset: [5, -2],
        },
      },
    },
    mustOmit: ['boundary'],
  },
  {
    id: 'NC017',
    task: 'A 已布局。将新节点中心对齐到 A 的 top 边上，按从左到右量取该边长度的 25% 处；使用边界比例锚点。',
    expected: {
      type: 'node',
      position: {
        kind: 'anchor',
        target: {
          id: 'A',
          anchor: {
            side: 'top',
            fraction: 0.25,
          },
        },
      },
    },
  },
  {
    id: 'NC018',
    task: 'A 已布局。将新节点中心对齐到 A 的 right 边上，按从上到下量取该边长度的 75% 处；使用边界比例锚点。',
    expected: {
      type: 'node',
      position: {
        kind: 'anchor',
        target: {
          id: 'A',
          anchor: {
            side: 'right',
            fraction: 0.75,
          },
        },
      },
    },
  },
  {
    id: 'NC019',
    task: 'A 已布局。将新节点中心对齐到 A 的 bottom 边上，按从左到右量取该边长度的 25% 处；使用边界比例锚点。',
    expected: {
      type: 'node',
      position: {
        kind: 'anchor',
        target: {
          id: 'A',
          anchor: {
            side: 'bottom',
            fraction: 0.25,
          },
        },
      },
    },
  },
  {
    id: 'NC020',
    task: 'A 已布局。将新节点中心对齐到 A 的 left 边上，按从上到下量取该边长度的 75% 处；使用边界比例锚点。',
    expected: {
      type: 'node',
      position: {
        kind: 'anchor',
        target: {
          id: 'A',
          anchor: {
            side: 'left',
            fraction: 0.75,
          },
        },
      },
    },
  },
  {
    id: 'NC021',
    task: 'A 的已注册外形提供名为 outlet 的锚点。将新节点自身的右下锚点对齐到它，目标使用已注册 portRing 连接边界并传参数 {"gap":1}。',
    expected: {
      type: 'node',
      position: {
        kind: 'anchor',
        target: {
          id: 'A',
          anchor: 'outlet',
          boundary: {
            type: 'portRing',
            params: {
              gap: 1,
            },
          },
        },
        selfAnchor: 'bottom-right',
      },
    },
  },
  {
    id: 'NC022',
    task: 'A 已布局。将当前节点朝 180 度方向的边界锚点对齐到 A 的中心，保留引用和角度锚点。',
    expected: {
      type: 'node',
      position: {
        kind: 'anchor',
        target: {
          id: 'A',
        },
        selfAnchor: 180,
      },
    },
  },
  {
    id: 'NC023',
    task: 'A 已布局。在当前节点的下边，用从左到右的比例指定四分之一处的点。将该点对齐到 A 上名为 left 的锚点。',
    expected: {
      type: 'node',
      position: {
        kind: 'anchor',
        target: {
          id: 'A',
          anchor: 'left',
        },
        selfAnchor: {
          side: 'bottom',
          fraction: 0.25,
        },
      },
    },
  },
];
