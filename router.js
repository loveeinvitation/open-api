const router = [
  // =======================================================
  // GENERIC ROUTE
  // =======================================================
  {
    type: "GET",
    endPoint: "/:model/lookup",
    service: "/dinamicCrud/list",
    auth: true,
    task: "lookup",
  },
  {
    type: "GET",
    endPoint: "/:model/list",
    service: "/dinamicCrud/list",
    auth: true,
  },
  {
    type: "GET",
    endPoint: "/:model/view/:id",
    service: "/dinamicCrud/view",
    auth: true,
  },
  {
    type: "POST",
    endPoint: "/:model/create",
    service: "/dinamicCrud/create",
    auth: true,
  },
  {
    type: "PUT",
    endPoint: "/:model/update",
    service: "/dinamicCrud/update",
    auth: true,
  },
  {
    type: "DELETE",
    endPoint: "/:model/delete/:id",
    service: "/dinamicCrud/delete",
    auth: true,
  },
  // =======================================================
  {
    type: "POST",
    endPoint: "/drive-upload",
    service: "/driveUpload",
    auth: false,
  },
]
module.exports = router
