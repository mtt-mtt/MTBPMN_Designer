/** @odoo-module **/

import { Component } from "@odoo/owl";

export class GenericPanel extends Component {
    static template = "bpmn_designer.GenericPanel";
    static props = {
        element: { type: Object },
        bpmnModeler: { type: Object },
    };

    get businessObject() {
        return this.props.element?.businessObject;
    }

    updateProperty(propName, value) {
        const { element, bpmnModeler } = this.props;
        if (!element || !bpmnModeler) return;
        const modeling = bpmnModeler.get('modeling');
        modeling.updateProperties(element, { [propName]: value });
    }
}