exports.seed = function (knex) {
  // Deletes ALL existing entries
  return knex('role_task')
    .del()
    .then(function () {
      // Inserts seed entries
      return knex('role_task').insert([{ id: 1, colName: 'rowValue1' }]);
    });
};
