// /bpmn_designer/static/src/js/odoo_context_pad_provider.js

/**
 * 这个文件实现了基于元素类型的、动态的 Context Pad。
 * - 如果是连线，显示“更换类型”和“删除”。
 * - 如果是节点，显示“连接”和“删除”。
 */
function OdooContextPadProvider(contextPad) {

    // 注册 provider，高优先级确保我们在默认 provider 之后执行
    contextPad.registerProvider(800, this);
}

OdooContextPadProvider.$inject = [
    'contextPad'
];

/**
 * 这是实现动态菜单的核心方法。
 * 我们会检查当前选中元素 `element` 的类型，然后决定要保留哪些默认的 `entries`。
 */
OdooContextPadProvider.prototype.getContextPadEntries = function(element) {

    return function(entries) {

        const businessObject = element.businessObject;
        const newEntries = {}; // 我们创建一个新的空对象，只把我们想要的条目放进去

        // === 逻辑判断 ===

        // Case 1: 如果选中的是连线 (SequenceFlow)
        // `$instanceOf` 是一个可靠的方法，用于检查元素的 BPMN 类型
        if (businessObject.$instanceOf('bpmn:SequenceFlow')) {

            // 保留 'replace' (小扳手)，用于切换默认流/条件流等
            if (entries.replace) {
                newEntries.replace = entries.replace;
            }

            // 保留 'delete' (垃圾桶)
            if (entries.delete) {
                newEntries.delete = entries.delete;
            }

        }
        // Case 2: 如果选中的是其他任何节点 (Task, Gateway, Event 等)
        else {

            // 保留 'connect' (连接工具)，用于从该节点拖出新连线
            if (entries.connect) {
                newEntries.connect = entries.connect;
            }

            // 保留 'delete' (垃圾桶)
            if (entries.delete) {
                newEntries.delete = entries.delete;
            }
        }

        // 返回我们精心筛选过的条目对象
        return newEntries;
    };
};

// --- 模块导出 ---
window.OdooContextPadModule = {
  __init__: ['odooContextPadProvider'],
  odooContextPadProvider: ['type', OdooContextPadProvider]
};