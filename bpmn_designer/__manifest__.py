{
    'name': 'MTBPMN_Designer',
    'version': '17.0.1.0.5',
    'category': 'Productivity',
    'summary': 'A simple BPMN Designer',
    'description': """
        This module demonstrates how to create a simple BPMN flowchart in Odoo 17.
    """,
    'depends': ['web'],
    'license': 'LGPL-3',
    'support': 'ttm28370@gmail.com',
    'author': 'mtt',
    'website': '',
    'images': ['static/description/banner.jpg'],
    'data': [
    ],
    'assets': {
        'web.assets_backend': [
            'bpmn_designer/static/lib/bpmn/bpmn-bundle.js',

            # --- 核心修复：确保依赖项首先加载 ---
            # 1. 加载基础组件
            'bpmn_designer/static/src/js/components/bpmn_many2one_field.js',
            'bpmn_designer/static/src/xml/components/bpmn_many2one_field.xml',
            'bpmn_designer/static/src/js/components/bpmn_domain_field.js',
            'bpmn_designer/static/src/xml/components/bpmn_domain_field.xml',

            # 2. 加载属性面板的子组件
            'bpmn_designer/static/src/js/components/generic_panel.js',
            'bpmn_designer/static/src/xml/components/generic_panel.xml',
            'bpmn_designer/static/src/js/components/task_panel.js',
            'bpmn_designer/static/src/xml/components/task_panel.xml',
            'bpmn_designer/static/src/js/components/sequence_flow_panel.js',
            'bpmn_designer/static/src/xml/components/sequence_flow_panel.xml',

            # 3. 加载主属性面板 (依赖于上面的子组件)
            'bpmn_designer/static/src/js/bpmn_properties_panel.js',
            'bpmn_designer/static/src/xml/bpmn_properties_panel.xml',

            # 4. 加载校验器 (依赖于核心库，但在主客户端之前)
            'bpmn_designer/static/src/js/bpmn_workflow_validator.js',

            # 5. 加载主客户端动作 (依赖于主属性面板和校验器)
            'bpmn_designer/static/src/js/bpmn_designer_client.js',
            'bpmn_designer/static/src/xml/bpmn_designer_client_template.xml',

            # 6. 加载其他辅助脚本和样式
            'bpmn_designer/static/src/js/odoo_palette_provider.js',
            'bpmn_designer/static/src/js/odoo_context_pad_provider.js',
            'bpmn_designer/static/src/css/bpmn_designer.css',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
}