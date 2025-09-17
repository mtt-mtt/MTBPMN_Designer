/** @odoo-module **/

import { Component, useRef, onWillStart, onMounted, onWillUnmount, useState } from '@odoo/owl';
import { registry } from '@web/core/registry';
import { useService } from '@web/core/utils/hooks';
import { useSetupView } from "@web/views/view_hook";
import { loadCSS, loadJS } from '@web/core/assets';
import { BpmnPropertiesPanel } from './bpmn_properties_panel';
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { WorkflowValidator } from './bpmn_workflow_validator';

export class BpmnDesignerClient extends Component {
    setup() {
        this.action = useService('action');
        this.notification = useService('notification');
        this.orm = useService("orm");
        this.dialog = useService("dialog");

        const context = this.props.action.context || {};
        this.res_model = context.active_model || 'workflow.definition';
        this.res_id = context.active_id;
        this.content = context.content;
        this.target_model = context.target_model || null;
        this.featureAvailability = context.feature_availability || {};

        this.fileInput = useRef('fileInput');
        this.state = useState({
            selectedElement: null,
            viewerReady: false,
            isDirty: false,
            elementVersion: 0,
        });
        this.viewer = null;
        this.odooModdle = null;

        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);

        useSetupView({
            beforeLeave: () => this.onBeforeLeave(),
        });

        this.exampleBpmnXML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds height="36" width="36" x="100" y="100"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

        onWillStart(async () => {
            await Promise.all([
                loadCSS('/bpmn_designer/static/lib/bpmn/assets/diagram-js.css'),
                loadCSS('/bpmn_designer/static/lib/bpmn/assets/bpmn-js.css'),
                loadCSS('/bpmn_designer/static/lib/bpmn/assets/bpmn-font/css/bpmn.css'),
            ]);
            await loadJS('/bpmn_designer/static/lib/bpmn/bpmn-bundle.js');
            await loadJS('/bpmn_designer/static/src/js/odoo_palette_provider.js');
            // 加载我们新的 Context Pad Provider
            await loadJS('/bpmn_designer/static/src/js/odoo_context_pad_provider.js');
            try {
                const response = await fetch('/bpmn_designer/static/src/js/custom_properties_panel/model/odoo-bpmn-moddle.json');
                this.odooModdle = await response.json();
            } catch (error) {
                console.error("加载 odoo-bpmn-moddle.json 失败:", error);
                this.notification.add("自定义BPMN模型加载失败", { type: 'danger' });
            }
        });

        onMounted(() => {
            setTimeout(() => { this.initBpmnViewer(); }, 100);
            window.addEventListener('beforeunload', this.handleBeforeUnload);
        });

        onWillUnmount(() => {
            window.removeEventListener('beforeunload', this.handleBeforeUnload);
        });
    }

    onBeforeLeave() {
        if (!this.state.isDirty) {
            return true;
        }
        return new Promise(resolve => {
            this.dialog.add(ConfirmationDialog, {
                body: "您有未保存的更改。如果离开，您的更改将会丢失。确定要继续吗？",
                title: "未保存的更改",
                confirmLabel: "丢弃更改",
                cancelLabel: "留在页面",
                confirm: () => {
                    resolve(true);
                },
                cancel: () => {
                    resolve(false);
                },
            });
        });
    }

    handleBeforeUnload(event) {
        if (this.state.isDirty) {
            event.preventDefault();
            event.returnValue = '';
        }
    }

    async initBpmnViewer() {
        const canvasContainer = document.querySelector('#bpmnContainer');
        if (!canvasContainer || !window.BpmnJSBundle) {
             console.error("BPMN 核心库或容器DOM未能正确加载。");
             return;
        }

        const { BpmnModeler } = window.BpmnJSBundle;
        const OdooPaletteModule = window.OdooPaletteModule;
        // 获取我们新的 Context Pad 模块
        const OdooContextPadModule = window.OdooContextPadModule;

        if (!OdooPaletteModule || !OdooContextPadModule) {
            console.error("OdooPaletteModule 或 OdooContextPadModule 未能正确加载到window对象上。");
            this.notification.add("自定义工具加载失败", { type: 'danger' });
            return;
        }

        this.viewer = new BpmnModeler({
            container: canvasContainer,
            // 将我们的两个自定义模块都添加到 additionalModules 中
            additionalModules: [
                OdooPaletteModule,
                OdooContextPadModule
            ],
            moddleExtensions: { odoo: this.odooModdle }
        });

        this.state.viewerReady = true;
        const eventBus = this.viewer.get('eventBus');

        const setDirty = () => {
            if (!this.state.isDirty) {
                this.state.isDirty = true;
            }
        };

        // 简化事件监听：
        // - 'commandStack.changed' 用于标记 'isDirty' 状态，这是最可靠的。
        // - 'selection.changed' 用于更新右侧面板显示哪个元素。
        // - 我们不再需要在这里监听 'element.changed'，因为相关的联动逻辑已经
        //   被更健壮地封装在 SequenceFlowPanel 子组件内部了。
        eventBus.on('commandStack.changed', setDirty);

        eventBus.on('selection.changed', ({ newSelection }) => {
            this.state.selectedElement = newSelection.length > 0 ? newSelection[0] : null;
            // 当选择不同元素时，我们仍然需要 elementVersion 来强制刷新整个属性面板
            this.state.elementVersion++;
        });

        // --- 核心修复：添加这个新的事件监听器 ---
        eventBus.on('element.changed', ({ element }) => {
            // 如果被修改的元素，正是我们当前在属性面板中显示的元素，
            // 那么就强制刷新整个属性面板，以确保UI同步显示最新的数据。
            if (this.state.selectedElement && element.id === this.state.selectedElement.id) {
                this.state.elementVersion++;
            }
        });

        try {
            await this.viewer.importXML(this.content || this.exampleBpmnXML);
            this.state.isDirty = false;
            this.viewer.get('canvas').zoom('fit-viewport');
        } catch (err) {
            console.error('加载BPMN图时出错:', err);
            this.notification.add(`加载BPMN图失败: ${err.message}`, { type: 'danger' });
        }
    }

    async saveBpmn() {
        if (!this.viewer) return;

        const validationErrors = WorkflowValidator.validate(this.viewer);
        if (validationErrors.length > 0) {
            this.showValidationErrors(validationErrors);
            return;
        }

        try {
            const { xml } = await this.viewer.saveXML({ format: true });
            await this.orm.write(this.res_model, [this.res_id], { bpmn_xml_content: xml });
            this.notification.add('BPMN 已保存', { type: 'success' });
            this.state.isDirty = false;
            window.history.back();
        } catch (err) {
            console.error("保存BPMN失败:", err);
            this.notification.add(`保存BPMN失败: ${err.message || err}`, { type: 'danger' });
        }
    }

    showValidationErrors(errors) {
        const errorMessages = errors.map(error =>
            `<li class="list-group-item list-group-item-action" style="cursor: pointer;" data-element-id="${error.element.id}">${error.message}</li>`
        ).join('');

        const dialogContentString = `
            <p>您的流程图存在以下逻辑问题，请修复后再保存：</p>
            <ul class="list-group mt-3">${errorMessages}</ul>
        `;

        const dialogBody = owl.markup(dialogContentString);

        const dialog = this.dialog.add(ConfirmationDialog, {
            title: "流程逻辑检查未通过",
            body: dialogBody,
            confirmLabel: "好的",
            confirm: () => {},
        });

        setTimeout(() => {
            const dialogElement = dialog.el;
            if (dialogElement) {
                dialogElement.querySelectorAll('li[data-element-id]').forEach(item => {
                    item.addEventListener('click', (ev) => {
                        const elementId = ev.currentTarget.dataset.elementId;
                        const element = this.viewer.get('elementRegistry').get(elementId);
                        if (element) {
                            this.viewer.get('selection').select(element);
                            this.viewer.get('canvas').scrollToElement(element, { top: 200, right: 200, bottom: 200, left: 500 });
                        }
                        dialog.close();
                    });
                });
            }
        }, 100);
    }

    backToForm() {
        window.history.back();
    }

    openFile() {
        this.fileInput.el.click();
    }

    async onFileChange(ev) {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const xml = e.target.result;
            if (this.viewer) {
                try {
                    await this.viewer.importXML(xml);
                    this.viewer.get('canvas').zoom('fit-viewport');
                    this.notification.add('BPMN 文件已加载', { type: 'info' });
                    this.state.isDirty = true;
                } catch (err) {
                    this.notification.add('加载BPMN文件失败', { type: 'danger' });
                    console.error('加载BPMN文件失败:', err);
                }
            }
        };
        reader.readAsText(file);
    }

    async downloadBpmn() {
        if (!this.viewer) return;
        try {
            const { xml } = await this.viewer.saveXML({ format: true });
            const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'diagram.bpmn';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("下载BPMN文件失败:", err);
            this.notification.add('下载BPMN文件失败', { type: 'warning' });
        }
    }

    async exportSvg() {
        if (!this.viewer) return;
        try {
            const { svg } = await this.viewer.saveSVG();
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'diagram.svg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("导出SVG失败:", err);
            this.notification.add('导出SVG失败', { type: 'warning' });
        }
    }
}

BpmnDesignerClient.template = 'bpmn_designer.BpmnDesignerClientTemplate';
BpmnDesignerClient.components = { BpmnPropertiesPanel };

BpmnDesignerClient.props = {
    action: Object,
    actionId: { type: Number, optional: true },
    className: { type: String, optional: true },
};

registry.category('actions').add('bpmn_designer_client', BpmnDesignerClient);