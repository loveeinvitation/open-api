require("dotenv").config();
const { CoreResponse } = require("./core/CallService");
var express = require("express");
var path = require("path");
var cors = require("cors");
const morgan = require("morgan");
var app = express();
app.use(cors());
app.use(morgan("tiny"));
app.use(express.json());

const port = process.env.PORT || "9500";
var http = require("http");
var server = http.createServer(app);

// APP SERVER
server.listen(port, "0.0.0.0");
server.on("error", (onError) => {});
server.on("listening", (resp) => {
  // console.log(`Server is running on port ${port}`)
});

//SOCKET IO
// app.io = io;
// var io = require("socket.io")(server);
// io.on("connection", (socket) => {
//   // console.log(`SERVER RUNNING ON PORT ${port}`)
//   // console.log(`CLIENT SOCKET ${socket.id} CONNECTED`)
//   io.emit("message", "Connect with server . . .");
// });


//Cron
// var cron = require("node-cron");
// const myCron = cron.schedule(
//   "* * * * * *",
//   () => {
//     console.log("Running a job at 01:00 at Asia/Jakarta");
//   },
//   {
//     scheduled: false,
//     timezone: "Asia/Jakarta",
//   }
// );

// if (Number(process.env.PRODUCTION) === 1) {
//   myCron.start();
// } else {
//   myCron.stop();
// }

app.use("/", express.static(path.join(__dirname, "public")));
app.use("/tmp", express.static(path.join(__dirname, "tmp")));
app.use(`/${process.env.FILE_UPLOAD_PATH}`, express.static(path.join(__dirname, `${process.env.FILE_UPLOAD_PATH}`)));

// REGISTER SERVICE
var commonRouter = require("./core/coreServiceProvider");
app.use("", commonRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  return CoreResponse.fail(res, "Page not found | Halaman tidak ditemukan", {}, 404);
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  return CoreResponse.fail(res, err.message, {}, err.status || 500);
});

global.is_blank = function (value) {
  return value === undefined || value == null || value == "";
};

module.exports = app;
