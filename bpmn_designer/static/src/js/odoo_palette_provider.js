// /bpmn_designer/static/src/js/odoo_palette_provider.js

function OdooPaletteProvider(palette, create, elementFactory, translate) {
    this._palette = palette;
    this._create = create;
    this._elementFactory = elementFactory;
    this._translate = translate;

    palette.registerProvider(1500, this);
}

OdooPaletteProvider.$inject = [ 'palette', 'create', 'elementFactory', 'translate' ];

OdooPaletteProvider.prototype.getPaletteEntries = function(element) {

    const {
        _create: create,
        _elementFactory: elementFactory,
        _translate: translate
    } = this;

    function createShape(event, type, options = {}) {
        const shape = elementFactory.createShape({
            type: type,
            businessObject: elementFactory._bpmnFactory.create(type, options)
        });
        create.start(event, shape);
    }

    return {
        'create.start-event': {
            group: 'events',
            className: 'bpmn-icon-start-event-none',
            title: translate('Create Start Event'),
            action: {
                dragstart: (event) => createShape(event, 'bpmn:StartEvent'),
                click: (event) => createShape(event, 'bpmn:StartEvent')
            }
        },
        'create.end-event': {
            group: 'events',
            className: 'bpmn-icon-end-event-none',
            title: translate('Create End Event'),
            action: {
                dragstart: (event) => createShape(event, 'bpmn:EndEvent'),
                click: (event) => createShape(event, 'bpmn:EndEvent')
            }
        },
        'events-separator': {
            group: 'events',
            separator: true
        },
        'create.approval-task': {
            group: 'activities',
            className: 'bpmn-icon-user-task',
            title: translate('创建审批任务'),
            action: {
                dragstart: (event) => createShape(event, 'bpmn:UserTask', {
                    name: '审批',
                    'odoo:taskCategory': 'approval'
                }),
                click: (event) => createShape(event, 'bpmn:UserTask', {
                    name: '审批',
                    'odoo:taskCategory': 'approval'
                })
            }
        },
        'create.handling-task': {
            group: 'activities',
            className: 'bpmn-icon-manual-task',
            title: translate('创建办理任务'),
            action: {
                dragstart: (event) => createShape(event, 'bpmn:UserTask', {
                    name: '办理',
                    'odoo:taskCategory': 'handling',
                    'odoo:handlingMode': 'blocking'
                }),
                click: (event) => createShape(event, 'bpmn:UserTask', {
                    name: '办理',
                    'odoo:taskCategory': 'handling',
                    'odoo:handlingMode': 'blocking'
                })
            }
        },
        'create.cc-task': {
            group: 'activities',
            className: 'bpmn-icon-service-task odoo-cc-task-icon',
            title: translate('创建抄送节点'),
            action: {
                dragstart: (event) => createShape(event, 'bpmn:ServiceTask', {
                    name: '抄送',
                    'odoo:taskType': 'cc'
                }),
                click: (event) => createShape(event, 'bpmn:ServiceTask', {
                    name: '抄送',
                    'odoo:taskType': 'cc'
                })
            }
        },
        'activities-separator': {
            group: 'activities',
            separator: true
        },
        'create.exclusive-gateway': {
            group: 'gateways',
            className: 'bpmn-icon-gateway-xor',
            title: translate('Create Exclusive Gateway'),
            action: {
                dragstart: (event) => createShape(event, 'bpmn:ExclusiveGateway'),
                click: (event) => createShape(event, 'bpmn:ExclusiveGateway')
            }
        }
    };
};

window.OdooPaletteModule = {
  __init__: [ 'paletteProvider' ],
  paletteProvider: [ 'type', OdooPaletteProvider ]
};