const model = {
  TABLE_NAME: "analysis_standard_month",
  ALLOW: { create: true, update: true, list: true, delete: true, view: true },
  SOFT_DELETE: false,
  FIELDS_UNIQUE: [],
  STATIC_FILTER: [],
  STATIC_VALUE: [],
  VALIDATION_DATA: [],
  FIELDS: [
    { id: "id", methods: { list: true, view: true, create: true, update: true, } },
  ],
};
const beforeCreate = async function (input, db) {
  // input.createData || PAYLOAD CREATE FORM
};
const afterCreate = async function (input, db) {
  // input.createData || PAYLOAD CREATE FORM
};
const beforeUpdate = async function (input, db) {};
const afterUpdate = async function (input, db) {};

const beforeDelete = async function (input, db) {
  //  input.primaryData || OLD VALUE
};
const afterDelete = async function (input, db) {
  //  input.primaryData || OLD VALUE
};

module.exports = {
  model,
  beforeUpdate,
  afterUpdate,
  beforeCreate,
  afterCreate,
  beforeDelete,
  afterDelete,
};
