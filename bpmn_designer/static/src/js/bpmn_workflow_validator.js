/** @odoo-module **/

export const WorkflowValidator = {

    validate(viewer) {
        const elementRegistry = viewer.get('elementRegistry');
        let errors = [];

        errors.push(...this._checkEndEvent(elementRegistry));
        errors.push(...this._checkGateways(elementRegistry));
        errors.push(...this._checkOrphans(elementRegistry));

        return errors;
    },

    _checkEndEvent(registry) {
        const endEvents = registry.filter(el => el.type === 'bpmn:EndEvent');
        if (endEvents.length === 0) {
            const process = registry.find(el => el.type === 'bpmn:Process');
            return [{
                element: process,
                message: "流程必须包含至少一个结束事件。",
            }];
        }
        return [];
    },

    _checkGateways(registry) {
        const errors = [];
        const exclusiveGateways = registry.filter(el => el.type === 'bpmn:ExclusiveGateway');

        for (const gateway of exclusiveGateways) {
            const businessObject = gateway.businessObject;
            const outgoingFlows = gateway.outgoing || [];
            const name = businessObject.name || `ID: ${gateway.id}`;

            if (outgoingFlows.length < 2) {
                errors.push({
                    element: gateway,
                    message: `排他网关 "${name}" 必须至少有两条出路。`,
                });
            } else if (!businessObject.get('default')) {
                // --- 优化点：只有在出路大于等于2条时，才检查默认流 ---
                errors.push({
                    element: gateway,
                    message: `排他网关 "${name}" 必须指定一条默认流。`,
                });
            }
        }
        return errors;
    },

    _checkOrphans(registry) {
        const errors = [];
        // --- 核心修复：只筛选节点(Shape)，排除连线(Connection) ---
        // 我们通过检查 !el.waypoints 来做到这一点，因为只有连线有 waypoints 属性。
        const shapes = registry.filter(el => el.type !== 'bpmn:Process' && el.type !== 'label' && !el.waypoints);

        for (const shape of shapes) {
            const businessObject = shape.businessObject;
            const incomingFlows = shape.incoming || [];
            const outgoingFlows = shape.outgoing || [];
            const name = businessObject.name || `ID: ${shape.id}`;

            if (shape.type !== 'bpmn:StartEvent' && incomingFlows.length === 0) {
                errors.push({
                    element: shape,
                    message: `节点 "${name}" 是一个孤立节点，缺少输入连线。`,
                });
            }

            if (shape.type !== 'bpmn:EndEvent' && outgoingFlows.length === 0) {
                errors.push({
                    element: shape,
                    message: `节点 "${name}" 是一个断头节点，缺少输出连线。`,
                });
            }
        }
        return errors;
    },
};