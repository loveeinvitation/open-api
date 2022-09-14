const model = {
    TRANSACTION: true, // ROLEBACK ON ERROR
    TABLE_NAME: 'product',
    ALLOW: {
        create: true,
        update: true,
        list: true,
        delete: true,
        view: true,
    },
    SOFT_DELETE: false,
    FIELDS_UNIQUE: [],
    STATIC_FILTER: [
        { id: 'corporate_id', value: 'current_corporate_id' }
    ],
    STATIC_VALUE: [
        { id: 'uuid', value: 'generate_uuid' },
        { id: 'corporate_id', value: 'current_corporate_id' },
        { id: 'created_by', value: 'current_user_id' },
        { id: 'updated_by', value: 'current_user_id' },
        { id: 'created_at', value: 'current_datetime' },
        { id: 'updated_at', value: 'current_datetime' },
    ],
    VALIDATION_DATA: [
        {
            id: 'product_category_id', table: 'product_category', validation: [
                { id: 'id', value: 'current_value' },
                { id: 'corporate_id', value: 'current_corporate_id' }
            ]
        },

        {
            id: 'product_type_id', table: 'product_type', validation: [
                { id: 'id', value: 'current_value' },
                { id: 'corporate_id', value: 'current_corporate_id' }
            ]
        },

        {
            id: 'uom_id', table: 'uom', validation: [
                { id: 'id', value: 'current_value' },
                { id: 'corporate_id', value: 'current_corporate_id' }
            ]
        },

    ],
    FIELDS: [
        {
            id: 'id', methods: {
                list: true,
                view: true,
                create: true,
                update: true,
            }
        },
        {
            id: 'uuid', methods: {
                list: true,
                view: true,
                create: true,
                update: false,
            }
        },
        {
            id: 'corporate_id', methods: {
                list: {
                    type: 'lookup',
                    relation_table: 'corporate',
                    relation_field: 'id',
                    relation_display: [`code`, `name`],
                    validation: ['integer'],
                    filter: false,
                    sort: true,
                    search: true
                },
                view: {
                    type: 'lookup',
                    relation_table: 'corporate',
                    relation_field: 'id',
                    relation_display: [`code`, `name`],
                    validation: ['integer']
                },
                create: {
                    validation: ['required', 'integer']
                },
                update: false,
            }
        },
        {
            id: 'product_category_id', methods: {
                list: {
                    type: 'lookup',
                    relation_table: 'product_category',
                    relation_field: 'id',
                    relation_display: [`name`],
                    validation: ['integer'],
                    filter: true,
                    sort: true,
                    search: true
                },
                view: {
                    type: 'lookup',
                    relation_table: 'product_category',
                    relation_field: 'id',
                    relation_display: [`name`],
                    validation: ['integer'],
                    filter: true,
                    sort: true,
                    search: true
                },
                create: {
                    validation: ['required', 'integer']
                },
                update: {
                    validation: ['required', 'integer']
                },
            }
        },
        {
            id: 'product_type_id', methods: {
                list: {
                    type: 'lookup',
                    relation_table: 'product_type',
                    relation_field: 'id',
                    relation_display: [`name`],
                    validation: ['integer'],
                    filter: true,
                    sort: true,
                    search: true
                },
                view: {
                    type: 'lookup',
                    relation_table: 'product_type',
                    relation_field: 'id',
                    relation_display: [`name`],
                    validation: ['integer'],
                    filter: true,
                    sort: true,
                    search: true
                },
                create: {
                    validation: ['required', 'integer']
                },
                update: {
                    validation: ['required', 'integer']
                },
            }
        },
        {
            id: 'uom_id', methods: {
                list: {
                    type: 'lookup',
                    relation_table: 'uom',
                    relation_field: 'id',
                    relation_display: [`name`],
                    validation: ['integer'],
                    filter: true,
                    sort: true,
                    search: true
                },
                view: {
                    type: 'lookup',
                    relation_table: 'uom',
                    relation_field: 'id',
                    relation_display: [`name`],
                    validation: ['integer'],
                    filter: true,
                    sort: true,
                    search: true
                },
                create: {
                    validation: ['required', 'integer']
                },
                update: {
                    validation: ['required', 'integer']
                },
            }
        },
        {
            id: 'name', methods: {
                list: { search: true, sort: true },
                view: true,
                create: true,
                update: true,
            }
        },
        {
            id: 'unit_price', methods: {
                list: true,
                view: true,
                create: { type: 'integer', default: 0, validation: ['required', 'integer'] },
                update: { type: 'integer', default: 0, validation: ['required', 'integer'] },
            }
        },
        {
            id: 'description', methods: {
                list: true,
                view: true,
                create: true,
                update: true,
            }
        },
        {
            id: 'photo', methods: {
                list: { type: 'image', path: 'product' },
                view: { type: 'image', path: 'product' },
                create: { type: 'image', path: 'product', allowed: ['png', 'jpg', 'jpeg'] },
                update: { type: 'image', path: 'product', allowed: ['png', 'jpg', 'jpeg'] },
            }
        },

        {
            id: 'active', methods: {
                list: true,
                view: true,
                create: {
                    type: 'integer',
                    default: '1',
                    validation: ['integer', 'max:1', 'min:1', 'required']
                },
                update: false,
            }
        },
        {
            id: 'created_by', methods: {
                list: {
                    type: 'lookup',
                    relation_table: 'corporate',
                    relation_field: 'id',
                    relation_display: [`name`],
                    validation: ['integer']
                },
                view: {
                    type: 'lookup',
                    relation_table: 'corporate',
                    relation_field: 'id',
                    relation_display: [`name`],
                    validation: ['integer']
                },
                create: true,
                update: false,
            }
        },

        {
            id: 'updated_by', methods: {
                list: {
                    type: 'lookup',
                    relation_table: 'users',
                    relation_field: 'id',
                    relation_display: [`name`],
                    validation: ['integer']
                },
                view: {
                    type: 'lookup',
                    relation_table: 'users',
                    relation_field: 'id',
                    relation_display: [`name`],
                    validation: ['integer']
                },
                create: false,
                update: true
            }
        },
        {
            id: 'created_at', methods: {
                list: {
                    type: 'datetime',
                },
                view: true,
                create: true,
                update: false
            }
        },
        {
            id: 'updated_at', methods: {
                list: {
                    type: 'datetime',
                },
                view: true,
                create: false,
                update: true
            }
        },
    ],
}
module.exports = { model }