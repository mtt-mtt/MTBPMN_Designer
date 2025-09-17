/** @odoo-module **/

import { Component } from "@odoo/owl";
// --- 核心修复：使用正确的相对路径导入子组件 ---
import { GenericPanel } from './components/generic_panel';
import { TaskPanel } from './components/task_panel';
import { SequenceFlowPanel } from './components/sequence_flow_panel';

export class BpmnPropertiesPanel extends Component {
    static template = "bpmn_designer.BpmnPropertiesPanel";
    static components = { GenericPanel, TaskPanel, SequenceFlowPanel };
    static props = {
        element: { type: [Object, { value: null }], optional: true },
        bpmnModeler: { type: Object },
        targetModel: { type: String, optional: true },
        features: { type: Object, optional: true },
    };

    get businessObject() {
        return this.props.element?.businessObject;
    }

    get isTask() {
        const type = this.props.element?.type;
        return type === 'bpmn:UserTask' || (type === 'bpmn:ServiceTask' && this.businessObject?.get('odoo:taskType') === 'cc');
    }

    get isSequenceFlow() {
        return this.props.element?.type === 'bpmn:SequenceFlow';
    }

    getElementLabel(type) {
        if (this.isTask && type === 'bpmn:ServiceTask') return '抄送任务';
        const bo = this.businessObject;
        if (bo?.get('odoo:taskCategory') === 'approval' || (!bo?.get('odoo:taskCategory') && type === 'bpmn:UserTask')) return '审批任务';
        if (bo?.get('odoo:taskCategory') === 'handling') return '办理任务';

        if (!type) return '';
        const labels = {
            'bpmn:Process': '流程', 'bpmn:StartEvent': '开始事件', 'bpmn:EndEvent': '结束事件',
            'bpmn:UserTask': '用户任务', 'bpmn:ServiceTask': '服务任务',
            'bpmn:ExclusiveGateway': '排他网关', 'bpmn:SequenceFlow': '顺序流',
        };
        return labels[type] || type.replace('bpmn:', '');
    }

    getElementIcon(type) {
        if (this.isTask && type === 'bpmn:ServiceTask') return 'fa fa-share-square-o';
        const bo = this.businessObject;
        if (bo?.get('odoo:taskCategory') === 'approval' || (!bo?.get('odoo:taskCategory') && type === 'bpmn:UserTask')) return 'fa fa-user-o';
        if (bo?.get('odoo:taskCategory') === 'handling') return 'fa fa-pencil-square-o';

        if (!type) return 'fa fa-cube';
        const icons = {
            'bpmn:Process': 'fa fa-cogs', 'bpmn:StartEvent': 'fa fa-play-circle-o', 'bpmn:EndEvent': 'fa fa-stop-circle-o',
            'bpmn:UserTask': 'fa fa-user-o', 'bpmn:ServiceTask': 'fa fa-gear',
            'bpmn:ExclusiveGateway': 'fa fa-diamond', 'bpmn:SequenceFlow': 'fa fa-long-arrow-right',
        };
        return icons[type] || 'fa fa-question-circle-o';
    }
}