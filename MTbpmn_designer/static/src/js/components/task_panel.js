/** @odoo-module **/

import { Component, useState, onWillStart, onWillUpdateProps } from "@odoo/owl";
// --- 核心修复：使用同级目录相对路径 ---
import { BpmnMany2oneField } from './bpmn_many2one_field';

export class TaskPanel extends Component {
    static template = "bpmn_designer.TaskPanel";
    static components = { BpmnMany2oneField };
    static props = {
        element: { type: Object },
        bpmnModeler: { type: Object },
        features: { type: Object, optional: true },
    };

    setup() {
        this.state = useState({
            assigneeType: 'user',
            assigneeScope: 'global',
            approvalMode: 'anyone',
            handlingMode: 'blocking',
            timeoutAction: 'do_nothing',
            timeoutAssigneeType: 'user',
            timeoutAssigneeScope: 'global',
            reminders: [],
        });

        onWillStart(() => this.updateStateFromBusinessObject());
        onWillUpdateProps(() => this.updateStateFromBusinessObject());
    }

    updateStateFromBusinessObject() {
        const bo = this.businessObject;
        if (bo) {
            this.state.assigneeType = bo.get('odoo:assigneeType') || 'user';
            this.state.assigneeScope = bo.get('odoo:assigneeScope') || 'global';
            this.state.approvalMode = bo.get('odoo:approvalMode') || 'anyone';
            this.state.handlingMode = bo.get('odoo:handlingMode') || 'blocking';
            this.state.timeoutAction = bo.get('odoo:timeoutAction') || 'do_nothing';
            this.state.timeoutAssigneeType = bo.get('odoo:timeoutAssigneeType') || 'user';
            this.state.timeoutAssigneeScope = bo.get('odoo:timeoutAssigneeScope') || 'global';
            try {
                const remindersJson = bo.get('odoo:reminders');
                let reminders = remindersJson ? JSON.parse(remindersJson) : [];
                reminders.forEach(r => {
                    if (!r.trigger) r.trigger = { offset: 0 };
                    if (!r.repetition) r.repetition = {};
                });
                this.state.reminders = reminders;
            } catch (e) {
                console.error("Error parsing reminders JSON:", e);
                this.state.reminders = [];
            }
        }
    }

    get businessObject() {
        return this.props.element?.businessObject;
    }

    get hasHrModule() {
        return this.props.features && this.props.features.has_hr_module;
    }

    isApprovalTask() {
        const el = this.props.element;
        return el?.type === 'bpmn:UserTask' && (el.businessObject?.get('odoo:taskCategory') === 'approval' || !el.businessObject?.get('odoo:taskCategory'));
    }

    isHandlingTask() {
        const el = this.props.element;
        return el?.type === 'bpmn:UserTask' && el.businessObject?.get('odoo:taskCategory') === 'handling';
    }

    isTimeoutConfigurableTask() {
        return this.isApprovalTask() || this.isHandlingTask();
    }

    updateProperties = (properties) => {
        const { element, bpmnModeler } = this.props;
        if (!element || !bpmnModeler) return;
        const modeling = bpmnModeler.get('modeling');
        modeling.updateProperties(element, properties);
    }

    updateOdooProperty = (propName, value) => {
        this.updateProperties({ [propName]: value || undefined });
    }

    onAssigneeTypeChange = (ev) => this._onAssigneeConfigChange(ev.target.value, 'assignee');
    onScopeChange = (ev) => this._onScopeConfigChange(ev.target.value, 'assignee');
    onApprovalModeChange = (ev) => {
        this.state.approvalMode = ev.target.value;
        this.updateOdooProperty('odoo:approvalMode', ev.target.value);
    }
    onHandlingModeChange = (ev) => {
        this.state.handlingMode = ev.target.value;
        this.updateOdooProperty('odoo:handlingMode', ev.target.value);
    }

    onTimeoutEnableChange = (ev) => {
        const isEnabled = ev.target.checked;
        const propsToUpdate = { 'odoo:timeoutEnable': isEnabled || undefined };
        if (isEnabled) {
            if (!this.businessObject.get('odoo:timeoutDuration')) {
                propsToUpdate['odoo:timeoutDuration'] = '24';
            }
            if (!this.businessObject.get('odoo:timeoutUnit')) {
                propsToUpdate['odoo:timeoutUnit'] = 'hours';
            }
        }
        this.updateProperties(propsToUpdate);
    }

    onTimeoutActionChange = (ev) => {
        const newAction = ev.target.value;
        this.state.timeoutAction = newAction;
        const propsToUpdate = { 'odoo:timeoutAction': newAction };
        if (newAction !== 'escalate') {
            const escalationProps = [
                'odoo:timeoutAssigneeType', 'odoo:timeoutAssignee', 'odoo:timeoutAssigneeJob',
                'odoo:timeoutAssigneeScope', 'odoo:timeoutAssigneeDepartment', 'odoo:timeoutAssigneeDeptLevel',
                'odoo:timeoutReportingLevel', 'odoo:timeoutCeilingJobId'
            ];
            escalationProps.forEach(prop => propsToUpdate[prop] = undefined);
            this.state.timeoutAssigneeType = 'user';
            this.state.timeoutAssigneeScope = 'global';
        }
        this.updateProperties(propsToUpdate);
    }

    onTimeoutAssigneeTypeChange = (ev) => this._onAssigneeConfigChange(ev.target.value, 'timeoutAssignee');
    onTimeoutScopeChange = (ev) => this._onScopeConfigChange(ev.target.value, 'timeoutAssignee');

    _saveReminders = () => {
        const remindersJson = JSON.stringify(this.state.reminders);
        this.updateOdooProperty('odoo:reminders', remindersJson);
    }

    addReminder = () => {
        const newReminder = {
            id: 'rule_' + Date.now() + Math.random().toString().substring(2, 8),
            trigger: { base: 'deadline', offset: -2, unit: 'hours' },
            channels: ['odoo'],
            recipients: ['assignee'],
            message: `您的任务'{record_name}'即将于{deadline}超时，请尽快处理。`,
            repetition: { enabled: false, interval: 1, unit: 'hours', limit: 3 },
        };
        this.state.reminders.push(newReminder);
        this._saveReminders();
    }

    removeReminder = (index) => {
        this.state.reminders.splice(index, 1);
        this._saveReminders();
    }

    updateReminder = (index, key, value) => {
        if (this.state.reminders[index]) {
            this.state.reminders[index][key] = value;
            this._saveReminders();
        }
    }

    updateReminderTrigger = (index, key, value) => {
        const reminder = this.state.reminders[index];
        if (reminder) {
            if (key === 'offset_sign') {
                const sign = parseInt(value, 10);
                reminder.trigger.offset = Math.abs(reminder.trigger.offset || 0) * sign;
            } else if (key === 'offset_value') {
                const sign = Math.sign(reminder.trigger.offset || -1);
                reminder.trigger.offset = Math.abs(parseInt(value, 10) || 0) * (sign === 0 ? -1 : sign);
            } else {
                reminder.trigger[key] = value;
            }
            this._saveReminders();
        }
    }

    updateReminderArray = (index, key, value, isChecked) => {
        const reminder = this.state.reminders[index];
        if (reminder) {
            const currentArray = reminder[key] || [];
            if (isChecked) {
                if (!currentArray.includes(value)) {
                    currentArray.push(value);
                }
            } else {
                const valueIndex = currentArray.indexOf(value);
                if (valueIndex > -1) {
                    currentArray.splice(valueIndex, 1);
                }
            }
            reminder[key] = currentArray;
            this._saveReminders();
        }
    }

    updateReminderRepetition = (index, key, value) => {
        const reminder = this.state.reminders[index];
        if (reminder) {
            if (!reminder.repetition) {
                reminder.repetition = {};
            }
            reminder.repetition[key] = value;
            this._saveReminders();
        }
    }

    _onAssigneeConfigChange(newType, prefix) {
        this.state[`${prefix}Type`] = newType;
        const propsToUpdate = { [`odoo:${prefix}Type`]: newType };
        const userProps = [`odoo:${prefix}`];
        const positionProps = [`odoo:${prefix}Job`, `odoo:${prefix}Scope`, `odoo:${prefix}Department`, `odoo:${prefix}DeptLevel`];
        const reportingLineProps = [`odoo:${prefix.replace('Assignee', '')}ReportingLevel`, `odoo:${prefix.replace('Assignee', '')}CeilingJobId`];
        const propsToClear = {
            user: [...positionProps, ...reportingLineProps],
            position: [...userProps, ...reportingLineProps],
            reporting_line: [...userProps, ...positionProps],
        }[newType];

        if (propsToClear) {
            propsToClear.forEach(prop => propsToUpdate[prop] = undefined);
        }
        this.state[`${prefix}Scope`] = 'global';
        this.updateProperties(propsToUpdate);
    }

    _onScopeConfigChange(newScope, prefix) {
        this.state[`${prefix}Scope`] = newScope;
        const propsToUpdate = { [`odoo:${prefix}Scope`]: newScope || undefined };
        if (newScope !== 'department') {
            propsToUpdate[`odoo:${prefix}Department`] = undefined;
        }
        if (newScope !== 'submitter_dept') {
            propsToUpdate[`odoo:${prefix}DeptLevel`] = undefined;
        }
        this.updateProperties(propsToUpdate);
    }
}