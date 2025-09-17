/** @odoo-module **/
/* global BpmnJSBundle */

window.OdooBpmnProperties = window.OdooBpmnProperties || {};

const LOW_PRIORITY = 500;

// ======================= 审批人组件 (AssigneeComponent) =======================
const AssigneeComponent = (props) => {
    const { element, id, bpmnjs } = props;

    // --- 核心服务 ---
    const modeling = bpmnjs.get('modeling');
    const translate = bpmnjs.get('translate');
    const odooServices = bpmnjs.odooServices;

    // --- UI 组件和 Hooks ---
    const { SelectEntry, isSelectEntryEdited, useEffect, useState } = BpmnJSBundle;

    // --- 状态管理 ---
    const [users, setUsers] = useState([]);

    // --- 数据获取 ---
    useEffect(() => {
        // ========== 核心修正点：将所有参数放入 kwargs ==========
        odooServices.rpc('/web/dataset/call_kw/res.users/search_read', {
            model: 'res.users',
            method: 'search_read',
            args: [], // args 保持为空
            kwargs: {
                domain: [['share', '=', false]], // 将 domain 作为关键字参数放入 kwargs
                fields: ['name'],
                limit: 80,
                context: { active_test: false } // 将 active_test 放入 context
            }
        }).then(searchResult => {
            const userOptions = searchResult.map(user => ({
                label: user.name,
                value: String(user.id)
            }));
            setUsers(userOptions);
        }).catch(error => {
            console.error("Failed to fetch users:", error);
            if (odooServices.notification) {
                 odooServices.notification.add(translate("Failed to load user list"), { type: 'danger' });
            }
            setUsers([]);
        });
        // =======================================================
    }, []);

    // --- BPMN 模型读写 ---
    const getValue = () => {
        return element.businessObject.get('odoo:assignee') || '';
    };

    const setValue = (value) => {
        modeling.updateProperties(element, { 'odoo:assignee': value || undefined });
    };

    const getOptions = () => {
        return [
            { label: '<none>', value: '' },
            ...users
        ];
    };

    return SelectEntry({
        element,
        id,
        label: translate('Assignee'),
        getValue,
        setValue,
        getOptions,
        isEdited: isSelectEntryEdited
    });
};


// ======================= 主 Provider 类 (保持不变) =======================
class OdooPropertiesProvider {
    constructor(propertiesPanel, bpmnjs) {
        this.bpmnjs = bpmnjs;
        propertiesPanel.registerProvider(LOW_PRIORITY, this);
    }

    getGroups(element) {
        const bpmnjs = this.bpmnjs;
        const businessObject = element.businessObject;

        const VersionComponent = (props) => {
            const { element, id } = props;
            const modeling = bpmnjs.get('modeling');
            const translate = bpmnjs.get('translate');
            const debounce = bpmnjs.get('debounceInput');
            const moddle = bpmnjs.get('moddle');
            const { TextFieldEntry } = BpmnJSBundle;
            const businessObject = element.businessObject;
            const getValue = () => {
                const extensionElements = businessObject.get('extensionElements');
                if (extensionElements) {
                    const version = extensionElements.get('values').find(v => v.$type === 'odoo:Version');
                    return version ? version.get('body') : '';
                }
                return '';
            };
            const setValue = (value) => {
                let extensionElements = businessObject.get('extensionElements') || moddle.create('bpmn:ExtensionElements', { values: [] });
                const otherValues = extensionElements.get('values').filter((elem) => elem.$type !== 'odoo:Version');
                let newValues = otherValues;
                if (value) {
                    const newVersion = moddle.create('odoo:Version', { body: value });
                    newValues = [...otherValues, newVersion];
                }
                if (newValues.length) {
                    modeling.updateProperties(element, {
                        extensionElements: moddle.create('bpmn:ExtensionElements', { values: newValues })
                    });
                } else {
                    modeling.updateProperties(element, {
                        extensionElements: undefined
                    });
                }
            };
            return TextFieldEntry({ element, id, label: translate('Process Version'), getValue, setValue, debounce });
        };

        return (groups) => {
            const { Group, TextFieldEntry, isSelectEntryEdited } = BpmnJSBundle;
            let odooGroup = groups.find(g => g.id === 'odoo-properties');
            if (!odooGroup) {
                 odooGroup = {
                    id: 'odoo-properties',
                    label: 'Odoo Configuration',
                    component: Group,
                    entries: []
                };
            }
            if (businessObject?.$type === 'bpmn:Process') {
                if (!odooGroup.entries.find(e => e.id === 'odoo-process-version')) {
                    odooGroup.entries.push({
                        id: 'odoo-process-version',
                        component: VersionComponent,
                        isEdited: TextFieldEntry.isEdited,
                    });
                }
            }
            if (businessObject?.$type === 'bpmn:UserTask') {
                if (!odooGroup.entries.find(e => e.id === 'odoo-assignee')) {
                    odooGroup.entries.push({
                        id: 'odoo-assignee',
                        component: (props) => AssigneeComponent({ ...props, bpmnjs }),
                        isEdited: isSelectEntryEdited,
                    });
                }
            }
            if (odooGroup.entries.length > 0 && !groups.some(g => g.id === 'odoo-properties')) {
                groups.push(odooGroup);
            }
            return groups;
        };
    }
}

OdooPropertiesProvider.$inject = ['propertiesPanel', 'bpmnjs'];

window.OdooBpmnProperties.OdooPropertiesProvider = OdooPropertiesProvider;