/** @odoo-module **/

import { Component, onWillStart, onWillUpdateProps, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { Many2XAutocomplete } from "@web/views/fields/relational_utils";

export class BpmnMany2oneField extends Component {
    static template = "bpmn_designer.BpmnMany2oneField";
    static components = { Many2XAutocomplete };
    static props = {
        resModel: { type: String },
        value: { type: [String, Number], optional: true },
        update: { type: Function },
        // ========== 1. 在这里添加对 placeholder 的声明 ==========
        placeholder: { type: String, optional: true },
    };

    setup() {
        this.orm = useService("orm");

        this.state = useState({
            displayName: "",
            componentKey: 1,
        });

        onWillStart(() => this.loadName(this.props.value));
        onWillUpdateProps(async (nextProps) => {
            if (this.props.value !== nextProps.value) {
                await this.loadName(nextProps.value);
                this.state.componentKey++;
            }
        });
    }

    async loadName(id) {
        if (id && String(id).length > 0 && Number(id) > 0) {
            // 使用 orm.read 代替 orm.call
            const result = await this.orm.read(
                this.props.resModel,
                [parseInt(id, 10)],
                ['display_name'] // 直接请求 display_name 字段
            );
            // orm.read 返回的是一个对象数组，例如 [{id: 1, display_name: "Administrator"}]
            this.state.displayName = result.length ? result[0].display_name : "";
        } else {
            this.state.displayName = "";
        }
    }

    onUpdate(value) {
        const newRecord = Array.isArray(value) && value.length > 0 ? value[0] : null;
        const newId = newRecord ? newRecord.id : null;
        this.state.displayName = newRecord ? newRecord.name : "";
        this.props.update(newId ? String(newId) : "");
    }

    get autocompleteProps() {
        return {
            value: this.state.displayName,
            resModel: this.props.resModel,
            update: this.onUpdate.bind(this),
            getDomain: () => [],
            activeActions: { create: false, create_edit: false },
            fieldString: "Assignee",
            // ========== 2. 将接收到的 placeholder 传递给子组件 ==========
            placeholder: this.props.placeholder || "Search...",
        };
    }
}