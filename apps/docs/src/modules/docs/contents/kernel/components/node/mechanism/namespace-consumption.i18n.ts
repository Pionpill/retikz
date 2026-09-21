/** 引用消费图的双语说明 */
export const namespaceConsumptionI18n = {
  zh: {
    queue: 'pendingPaths（延迟队列）',
    map: 'children 登记完成后的 Map',
    enqueue: '入队，保留绘制位置',
    register: '布局完成后登记',
    flush: '收尾消费队列，再 lookup',
    immediate: 'Node position：遍历到它时立即 lookup',
    result: '读取 a 的布局，取 right 锚点',
    note: '定位不等待后声明节点；路径等待当前作用域登记完成',
  },
  en: {
    queue: 'pendingPaths (deferred queue)',
    map: 'Map after children register',
    enqueue: 'Enqueue; reserve paint order',
    register: 'Register after layout',
    flush: 'Consume queue, then lookup',
    immediate: 'Node position: lookup at traversal time',
    result: 'Read a.layout; select right anchor',
    note: 'Positioning does not wait for later nodes; paths wait for the current scope',
  },
};
