/** @odoo-module **/
import { Component, useState, onWillStart, onWillUpdateProps } from "@odoo/owl";
import { DomainSelector } from "@web/core/domain_selector/domain_selector";

export class BpmnDomainField extends Component {
    static template = "bpmn_designer.BpmnDomainField";
    static components = { DomainSelector };
    static props = {
        resModel: { type: String },
        domain: { type: String },
        update: { type: Function },
    };

    setup() {
        // ========== 核心修正点：用 state 来管理 domain ==========
        this.state = useState({
            isEditing: false,
            // 1. 创建一个内部的 domain 状态
            currentDomain: "[]",
        });

        // 2. 当组件首次加载时，用 props 初始化内部 state
        onWillStart(() => {
            this.state.currentDomain = this.props.domain;
        });

        // 3. 当父组件传入的 domain prop 变化时，同步更新内部 state
        onWillUpdateProps((nextProps) => {
            // 只有当接收到的新domain和当前内部domain不同时才更新，防止无限循环
            if (this.state.currentDomain !== nextProps.domain) {
                this.state.currentDomain = nextProps.domain;
            }
        });
    }

    onUpdate = (newDomain) => {
        // ========== 核心修正点：同时更新内部 state 和父组件 ==========
        // 4. 当 DomainSelector 更新时，首先更新我们自己的内部 state
        this.state.currentDomain = newDomain;
        // 5. 然后再调用父组件的回调，通知父组件数据已变更
        this.props.update(newDomain);
    }

    switchToEditMode = () => {
        this.state.isEditing = true;
    }

    switchToViewMode = () => {
        this.state.isEditing = false;
    }
}