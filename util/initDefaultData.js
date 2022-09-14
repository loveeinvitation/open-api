const { uuid } = require("uuidv4")
const { Global } = require('./globalFunction')
const initData = async function (db, corporate_id) {
    let currentDateTime = Global.currentDateTime()
    let conf = {
        default_customer_category: ["corporate_id", "name", "description"],
        default_payment_type: ["corporate_id", "name"],
        default_payment_chanel: ["corporate_id", "name"],
        default_shipping_type: ["corporate_id", "name", "description"],
        default_product_type: ["uuid", "corporate_id", "name", "description"],
        default_product_category: ["uuid", "corporate_id", "name", "description"],
        default_uom: ["uuid", "corporate_id", "name", "description"],
        default_casting_category: ["corporate_id", "name", "description"],
        default_material_category: ["uuid", "corporate_id", "name", "description"],
    }

    let data = await db.run_select(`SELECT*FROM default_data_config WHERE active ='1' `)
    for (let item of data) {
        let tbConf = conf[item.table_source]
        if (tbConf) {
            if (tbConf.includes('uuid')) {
                let d = await db.run_select(`SELECT*FROM ${item.table_source} WHERE active ='1' `)
                let insertData = []
                for (let a of d) {
                    let f = {}
                    for (let e of tbConf) {
                        if (e == 'uuid') {
                            f[e] = uuid()
                        } else if (e == 'corporate_id') {
                            f[e] = corporate_id
                        } else {
                            f[e] = a[e]
                        }
                    }
                    insertData.push(f)
                }
                if (insertData.length > 0) {
                    await db.run_insert(`${item.table_destination}`, insertData)
                }
            } else {
                let c = []
                for (let a of tbConf) {
                    if (a == 'corporate_id') {
                        a = '?'
                    }
                    c.push(a)
                }
                var sql = `INSERT INTO ${item.table_destination} (${tbConf.join(',')}) SELECT ${c.join(',')} 
                           FROM ${item.table_source} WHERE active ='1' `
                await db.row(sql, [corporate_id])
            }
        }
    }

    // INIT DATA QC INDICATOR
    let qcData = [
        {
            code: 'CEMENT',
            name: 'Cement / Fly Ash QC',
            description: `Cement / Fly Ash QC Indicator`,
            data: [
                {
                    name: 'Temperatur',
                    input_type: 'NUMERIC',
                    description: '',
                },
                {
                    name: 'Remark',
                    input_type: 'TEXT',
                    description: '',
                }
            ]
        },
        {
            code: 'SAND',
            name: 'SAND QC',
            description: `Sand QC indicator`,
            data: [
                {
                    name: 'Coloid Content',
                    input_type: 'NUMERIC',
                    description: '',
                },
                {
                    name: 'Org. Impurities',
                    input_type: 'NUMERIC',
                    description: '',
                },
                {
                    name: 'Gradiation',
                    input_type: 'TEXT',
                    description: '',
                },
                {
                    name: 'Contamination',
                    input_type: 'TEXT',
                    description: '',
                },
                {
                    name: 'Remark',
                    input_type: 'TEXT',
                    description: '',
                },
            ]
        },
        {
            code: 'COARSE',
            name: 'Coarse QC',
            description: `Coarse QC Indicator`,
            data: [
                {
                    name: 'Cleaness',
                    input_type: 'TEXT',
                    description: '',
                },
                {
                    name: 'Gradiation',
                    input_type: 'TEXT',
                    description: '',
                },
                {
                    name: 'Remark',
                    input_type: 'TEXT',
                    description: '',
                }
            ]
        },
    ]
    for (let item of qcData) {
        let qcIndicator = await db.run_insert(`qc_material_indicator`, {
            corporate_id:corporate_id,
            code: item.code,
            name: item.name,
            description: item.description,
            active: '1',
            created_by: '-1',
            created_at: currentDateTime
        })
        if (qcIndicator) {
            let qcDetail = []
            for (let d of item.data) {
                qcDetail.push({
                    qc_material_indicator_id: qcIndicator.id,
                    name: d.name,
                    description: d.description,
                    input_type: d.input_type,
                    active: '1',
                    created_by: '-1',
                    created_at: currentDateTime
                })
            }
            if (qcDetail.length > 0) {
                await db.run_insert(`qc_material_indicator_detail`, qcDetail, true)
            }
        }
    }

}

module.exports = initData