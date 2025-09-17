/** @odoo-module **/

import { Component } from "@odoo/owl";
import { BpmnDomainField } from './bpmn_domain_field';

export class SequenceFlowPanel extends Component {
    static template = "bpmn_designer.SequenceFlowPanel";
    static components = { BpmnDomainField };
    static props = {
        element: { type: Object },
        bpmnModeler: { type: Object },
        targetModel: { type: String, optional: true },
    };

    get businessObject() {
        return this.props.element?.businessObject;
    }

    // 只保留判断是否从网关引出的逻辑
    get isConditionalFlow() {
        const element = this.props.element;
        if (element?.type !== 'bpmn:SequenceFlow') return false;
        const sourceElement = element.source;
        return sourceElement && sourceElement.type === 'bpmn:ExclusiveGateway';
    }

    updateOdooProperty(propName, value) {
        const { element, bpmnModeler } = this.props;
        if (!element || !bpmnModeler) return;
        const modeling = bpmnModeler.get('modeling');
        modeling.updateProperties(element, { [propName]: value || undefined });
    }

    onDomainUpdate = (newDomain) => {
        this.updateOdooProperty('odoo:conditionDomain', newDomain);
    }
}