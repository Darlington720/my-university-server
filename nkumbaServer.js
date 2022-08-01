const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const knex = require("knex");
const { response } = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const { cookie } = require("express/lib/response");
const req = require("express/lib/request");

const upload = multer();
const app = express();
const baseIp = "0.0.0.0";
const secret = "mySecret";
const port = process.env.PORT ? process.env.PORT : 3000;

app.use(cors());
app.use(express.static(__dirname + "/public"));
app.use(upload.any());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(bodyParser.json());

const database = knex({
  client: "mysql",
  connection: {
    host: "us-cdbr-east-05.cleardb.net",
    user: "bb6abd34d1ddea",
    password: "3482abf1",
    database: "heroku_1072addfa8beeb0",
  },
});

const data = [
  "students",
  "students_signin_book",
  "visitors",
  "non_teaching_staff",
  "stu_signin",
  "constraints",
  "course_units",
];

data.map((item) =>
  app.get(`/${item}`, (req, res) => {
    database
      // .orderBy("id")
      .select("*")
      .from(item)
      .then((data) => {
        res.send(data);
      });
  })
);

app.get("/getFees", (req, res) => {
  database
    // .orderBy("id")
    .select("*")
    .from("fees_structure")
    .join(
      "nationality",
      "fees_structure.nationality_id",
      "=",
      "nationality.nationality_id"
    )
    .join("sessions", "fees_structure.session_id", "=", "sessions.session_id")
    .join("schools", "fees_structure.school_id", "=", "schools.school_id")
    .join("levels", "fees_structure.levels_id", "=", "levels.level_id")
    .then((data) => {
      res.send(data);
    });
});

app.post("/addAllMyCourseUnits", (req, res) => {
  const { stu_no, course_id } = req.body;
  let status = false;
  // console.log(req.body);
  database
    // .orderBy("id")
    .select("*")
    .from("stu_selected_course_units")
    .join(
      "course_units",
      "stu_selected_course_units.course_id",
      "=",
      "course_units.course_id"
    )
    .where(function () {
      this.where("stu_id", "=", stu_no);
    })
    .then((data) => {
      data.forEach((item) => {
        if (item.course_id == course_id) {
          res.send(
            `${item.course_name} already added, Please Choose another one`
          );
          status = true;
        }
      });
      if (status == false) {
        if (data.length >= 8) {
          res.send("Maximum number of course units selected");
        } else {
          database("stu_selected_course_units")
            .insert({
              stu_id: stu_no,
              course_id: course_id,
            })
            .then((data) => {
              res.send("Course Unit added Successfully");
            })
            .catch((err) => res.send(err));
        }
      }
    });

  // res.send("Received the data");
});

app.post("/removeSelectedCourseUnit", (req, res) => {
  const { stu_id, course_id } = req.body;
  // console.log("data", req.body);
  database("stu_selected_course_units")
    .where("stu_id", stu_id)
    .andWhere("course_id", course_id)
    .del()
    .then((data) => {
      res.send("Course Unit deleted Successfully");
    });
});

app.post("/addConstraint", (req, res) => {
  const { name, percentage } = req.body;
  database("constraints")
    .insert({
      c_name: name,
      c_percentage: percentage,
    })
    .then((data) => {
      res.send("Received the data");
    })
    .catch((err) => res.send(err));
});

app.post("/updateConstraint/", (req, res) => {
  const { c_id, c_name, c_percentage } = req.body;
  console.log(req.body);

  database("constraints")
    .where(function () {
      this.where("c_id", "=", c_id);
    })
    .update({
      c_name: c_name,
      c_percentage: c_percentage,
    })
    .then((data) => {
      res.send("updated the data");
    })
    .catch((err) => res.send(err));
});

app.get("/mySelectedCourseUnits/:stu_no", (req, res) => {
  const { stu_no } = req.params;
  console.log("new", stu_no);
  database
    // .orderBy("id")
    .select("*")
    .from("stu_selected_course_units")
    .join(
      "course_units",
      "stu_selected_course_units.course_id",
      "=",
      "course_units.course_id"
    )
    .where(function () {
      this.where("stu_id", "=", stu_no);
    })
    .then((data) => {
      res.send(data);
    });
});

app.post("/myCourseUnitsToday/", (req, res) => {
  // const { lectures } = req.params;
  // let arr = lectures.split(",");
  // console.log(lectures.split(","));

  console.log(Array.isArray(req.body));
  console.log(req.body);
  console.log("from the client ", req.body.my_array);
  console.log("from the client ", req.body.day);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log(d.getDay());
  let newArr = [];

  // arr.forEach((e) => {
  // console.log("lecture ", parseInt(e));
  // newArr.push(e);

  database
    .select("*")
    .from("timetable")
    .where("day_id", "=", req.body.day)
    .join("course_units", "timetable.c_unit_id", "=", "course_units.course_id")
    .join("lecturers", "timetable.lecturer_id", "=", "lecturers.lecturer_id")
    .join("schools", "timetable.school_id", "=", "schools.school_id")
    // .where("c_unit_id", "=", 1)
    .orderBy("start_time")
    .then((data) => {
      // newArr.push(data);
      // console.log(data);
      data.forEach((item) => {
        req.body.my_array.forEach((reqItem) => {
          if (item.c_unit_id == reqItem) {
            console.log(item.c_unit_id, reqItem);
            newArr.push(item);
          } else {
            // console.log("else " + item.c_unit_id, reqItem);
          }
        });
      });
      console.log("New array", newArr);
      res.send(newArr);

      // });
    });

  // res.send(newArr);
});

app.post("/lecturerCourseunits/", (req, res) => {
  // const { lectures } = req.params;
  // let arr = lectures.split(",");
  // console.log(lectures.split(","));

  const { lecturer_id, day } = req.body;
  // console.log(req.params);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log(d.getDay());
  let newArr = [];

  // arr.forEach((e) => {
  // console.log("lecture ", parseInt(e));
  // newArr.push(e);

  database
    .select("*")
    .from("timetable")
    // .where("day_id", "=", date)

    // .where("c_unit_id", "=", 1)
    // .andWhere("lecturer_id", "=", 11)
    .where({
      day_id: day,
      // lecturer_id,
    })
    .join("course_units", "timetable.c_unit_id", "=", "course_units.course_id")
    .join("lecturers", "timetable.lecturer_id", "=", "lecturers.lecturer_id")
    .join("schools", "timetable.school_id", "=", "schools.school_id")
    .orderBy("start_time")

    .then((data) => {
      database
        .select("*")
        .from("lecturers")
        .where({
          // day_id: 1,
          lecturer_id,
        })
        .then((lecturer) => {
          data.forEach((lecture) => {
            if (lecturer[0].lecturer_id == lecture.lecturer_id) {
              newArr.push(lecture);
            }
          });
          res.send(newArr);
        });
      // res.send(data);

      // });
    });

  // res.send(newArr);
});

app.post("/getCustomReports/", (req, res) => {
  const { date, requiredData } = req.body;
  console.log(req.body);
  if (requiredData && date) {
    if (requiredData == "students") {
      database
        .select("*")
        .from("students")

        .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")
        .join("users", "student_signin.signed_in_by", "=", "users.id")
        // .where("students.stu_id", "=", studentNo)
        .andWhere("student_signin.signin_date", "=", date)
        .orderBy("signin_time")
        .then((data) => {
          data.map((item) => {
            const d2 = new Date(item.signin_date);
            const date2 = ` ${d2.getFullYear()}-0${
              d2.getMonth() + 1
            }-${d2.getDate()}`;
            item.signin_date = date2;
          });
          res.send(data);
        });
    } else if (requiredData == "visitors") {
      database("users")
        .join(
          "visitors",
          "users.id",

          "=",
          "visitors.signed_in_by"
        )
        .where("visitors.date", "=", date)
        .orderBy("time")
        .select("*")
        .then((data) => {
          data.map((item) => {
            const d2 = new Date(item.date);
            const date2 = ` ${d2.getFullYear()}-0${
              d2.getMonth() + 1
            }-${d2.getDate()}`;
            item.date = date2;
          });
          res.send(data);
        });
    }
  }
});

app.get("/studentsToday", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")
    .join("users", "student_signin.signed_in_by", "=", "users.id")
    // .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)
    .orderBy("signin_time")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.signin_date);
        const date2 = ` ${d2.getFullYear()}-0${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.signin_date = date2;
      });
      res.send(data);
    });
});

app.get("/visitorData", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("users")
    .join(
      "visitors",
      "users.id",

      "=",
      "visitors.signed_in_by"
    )
    .where("visitors.date", "=", date)
    .orderBy("time")
    .select("*")
    .then((data) => {
      data.map((item) => {
        const d2 = new Date(item.date);
        const date2 = ` ${d2.getFullYear()}-0${
          d2.getMonth() + 1
        }-${d2.getDate()}`;
        item.date = date2;
      });
      res.send(data);
    });
});

app.get("/myVisitors/:user_id", (req, res) => {
  const { user_id } = req.params;
  console.log(user_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("visitors")
    .join(
      "users",
      "visitors.signed_in_by",

      "=",
      "users.id"
    )
    .where("visitors.date", "=", date)
    .select("*")
    .where({
      signed_in_by: user_id,
      date: date,
    })
    .then((data) => {
      res.send(data);
    });
});

app.get("/myStudents/:user_id", (req, res) => {
  const { user_id } = req.params;
  console.log(user_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("student_signin")
    // .join(
    //   "users",
    //   "students_signin_book.signed_in_by",

    //   "=",
    //   "users.id"
    // )
    // .where("student_signin.signin_date", "=", date)
    .select("*")
    .where({
      signed_in_by: user_id,
      signin_date: date,
    })
    .then((data) => {
      res.send(data);
    });
});

app.get("/studentData", (req, res) => {
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("students")
    .join(
      "students_signin_book",
      "students.stu_id",

      "=",
      "students_signin_book.stu_id"
    )

    .join(
      "students_signout_book",
      "students_signin_book.signin_date",
      "=",
      "students_signout_book.signin_date"
    )
    .where("students_signin_book.signin_date", "=", date)

    .select("*")
    .then((data) => {
      res.send(data);
    });
});

// app.get("/student/:studentNo", (req, res) => {
//   const { studentNo } = req.params;
//   console.log(studentNo);
//   const d = new Date();
//   const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

//   database
//     .select("*")
//     .from("students_signin_book")
//     .where({
//       stu_id: studentNo,
//       signin_date: date,
//     })
//     .then((data) => {
//       // res.send(data);
//       if (data.length > 0) {
//         database
//           .select("*")
//           .from("students")

//           .join(
//             "students_signin_book",
//             "students.stu_id",
//             "=",
//             "students_signin_book.stu_id"
//           )

//           .join(
//             "students_signout_book",
//             "students.stu_id",
//             "=",
//             "students_signout_book.stu_id"
//           )
//           .where("students.stu_id", "=", studentNo)
//           .andWhere("students_signout_book.signin_date", "=", date)
//           .then((data3) => {
//             // res.send(data3);
//             if (data3[0].sign_out !== null) {
//               res.send("Already registered");
//             } else {
//               res.send([
//                 data3[0],
//                 {
//                   todaysStatus: true,
//                   imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
//                 },
//               ]);
//             }
//           });
//       } else {
//         database
//           .select("*")
//           .from("students")
//           .where({
//             stu_id: studentNo,
//           })
//           .then((data2) => {
//             res.send([
//               ...data2,
//               {
//                 todaysStatus: false,
//                 imageUrl: data2[0]
//                   ? `http://${baseIp}:${port}/assets/${data2[0].image}`
//                   : "http://${baseIp}:${port}/assets/jacket.jpg",
//               },
//             ]);
//           });
//       }
//     });

//   // database("students")
//   //   .join(
//   //     "students_signin_book",
//   //     "students.stu_id",
//   //     "=",
//   //     "students_signin_book.stu_id"
//   //   )
//   //   .select("*")
//   //   // .where("quantity", ">", 0)

//   //   .then((data) => {
//   //     res.send(data);
//   //   });
// });

app.post("/allstudentdetails/", (req, res) => {
  const { studentNo, date } = req.body;
  console.log(req.body);
  const userId = 1;
  console.log(studentNo);
  // const d = new Date();
  // const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  // let modifiedData = [];
  // let modifiedObj = {};

  // database
  //   .select("*")
  //   .from("stu_signin")
  //   .join("students", "stu_signin.stu_id", "=", "students.stu_id")

  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      // res.send(data3);
      database
        .select("*")
        .from("students")

        .join("stu_signin", "students.stu_id", "=", "stu_signin.stu_id")
        // .join("users", "stu_signin.signin_user_id", "=", "users.id")
        // .join("assigned_gates", "users.id", "=", "assigned_gates.user_id")
        .where("students.stu_id", "=", studentNo)
        .andWhere("stu_signin.signin_date", "=", date)
        .then((data3) => {
          res.send([
            ...data3,
            {
              imageUrl: data3[0]
                ? `http://${baseIp}:${port}/assets/${data3[0].image}`
                : "http://${baseIp}:${port}/assets/jacket.jpg",
            },
          ]);

          // res.send(modifiedData);
          // if (data3.length > 0) {
          //   // res.send(data);
          //   if (data3[data3.length - 1].signout_time !== null) {
          //     // res.send("Already registered");
          //     database
          //       .select("*")
          //       .from("students")
          //       .where({
          //         stu_id: studentNo,
          //       })
          //       .then((data2) => {
          //         res.send([
          //           ...data2,
          //           {
          //             todaysStatus: "not new",
          //             imageUrl: data2[0]
          //               ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //               : "http://${baseIp}:${port}/assets/jacket.jpg",
          //           },
          //         ]);
          //       });
          //   } else {
          //     res.send([
          //       data3[data3.length - 1],
          //       {
          //         todaysStatus: true,
          //         imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
          //       },
          //     ]);
          //   }
          // } else {
          //   database
          //     .select("*")
          //     .from("students")
          //     .where({
          //       stu_id: studentNo,
          //     })
          //     .then((data2) => {
          //       res.send([
          //         ...data2,
          //         {
          //           todaysStatus: false,
          //           imageUrl: data2[0]
          //             ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //             : "http://${baseIp}:${port}/assets/jacket.jpg",
          //         },
          //       ]);
          //     });
          // }
        });
    });

  // database("students")
  //   .join(
  //     "students_signin_book",
  //     "students.stu_id",
  //     "=",
  //     "students_signin_book.stu_id"
  //   )
  //   .select("*")
  //   // .where("quantity", ">", 0)

  //   .then((data) => {
  //     res.send(data);
  //   });
});
app.get("/allstudentdetails/:studentNo", (req, res) => {
  const { studentNo } = req.params;
  const userId = 1;
  console.log(studentNo);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  let modifiedData = [];
  let modifiedObj = {};

  // database
  //   .select("*")
  //   .from("stu_signin")
  //   .join("students", "stu_signin.stu_id", "=", "students.stu_id")

  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      // res.send(data3);
      database
        .select("*")
        .from("students")

        .join("stu_signin", "students.stu_id", "=", "stu_signin.stu_id")
        // .join("users", "stu_signin.signin_user_id", "=", "users.id")
        // .join("assigned_gates", "users.id", "=", "assigned_gates.user_id")
        .where("students.stu_id", "=", studentNo)
        .andWhere("stu_signin.signin_date", "=", date)
        .then((data3) => {
          res.send([
            ...data3,
            {
              imageUrl: data3[0]
                ? `http://${baseIp}:${port}/assets/${data3[0].image}`
                : "http://${baseIp}:${port}/assets/jacket.jpg",
            },
          ]);

          // res.send(modifiedData);
          // if (data3.length > 0) {
          //   // res.send(data);
          //   if (data3[data3.length - 1].signout_time !== null) {
          //     // res.send("Already registered");
          //     database
          //       .select("*")
          //       .from("students")
          //       .where({
          //         stu_id: studentNo,
          //       })
          //       .then((data2) => {
          //         res.send([
          //           ...data2,
          //           {
          //             todaysStatus: "not new",
          //             imageUrl: data2[0]
          //               ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //               : "http://${baseIp}:${port}/assets/jacket.jpg",
          //           },
          //         ]);
          //       });
          //   } else {
          //     res.send([
          //       data3[data3.length - 1],
          //       {
          //         todaysStatus: true,
          //         imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
          //       },
          //     ]);
          //   }
          // } else {
          //   database
          //     .select("*")
          //     .from("students")
          //     .where({
          //       stu_id: studentNo,
          //     })
          //     .then((data2) => {
          //       res.send([
          //         ...data2,
          //         {
          //           todaysStatus: false,
          //           imageUrl: data2[0]
          //             ? `http://${baseIp}:${port}/assets/${data2[0].image}`
          //             : "http://${baseIp}:${port}/assets/jacket.jpg",
          //         },
          //       ]);
          //     });
          // }
        });
    });

  // database("students")
  //   .join(
  //     "students_signin_book",
  //     "students.stu_id",
  //     "=",
  //     "students_signin_book.stu_id"
  //   )
  //   .select("*")
  //   // .where("quantity", ">", 0)

  //   .then((data) => {
  //     res.send(data);
  //   });
});
app.get("/student/:studentNo", (req, res) => {
  const { studentNo } = req.params;
  const userId = 1;
  console.log("number", studentNo);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  // database
  //   .select("*")
  //   .from("stu_signin")
  //   .join("students", "stu_signin.stu_id", "=", "students.stu_id")

  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("students.stu_id", "=", studentNo)
    .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      // res.send(data3);
      database
        .select("*")
        .from("students")

        .join("stu_signin", "students.stu_id", "=", "stu_signin.stu_id")

        .where("students.stu_id", "=", studentNo)
        .andWhere("stu_signin.signin_date", "=", date)

        .then((data3) => {
          if (data3.length > 0) {
            // res.send(data);
            if (data3[data3.length - 1].signout_time !== null) {
              // res.send("Already registered");
              database
                .select("*")
                .from("students")
                // .join("finance", "students.stu_id", "=", "finance.stu_no")
                .where({
                  stu_id: studentNo,
                })
                .then((data2) => {
                  database
                    .select("*")
                    .from("constraints")
                    .then((data6) => {
                      res.send([
                        ...data2,
                        {
                          todaysStatus: "not new",
                          imageUrl: data2[0]
                            ? `http://${baseIp}:${port}/assets/${data2[0].image}`
                            : "http://${baseIp}:${port}/assets/jacket.jpg",
                          requiredPercentage: data6[0].c_percentage,
                        },
                      ]);
                    });
                });
            } else {
              database
                .select("*")
                .from("constraints")
                .then((data6) => {
                  res.send([
                    data3[data3.length - 1],
                    {
                      todaysStatus: true,
                      imageUrl: `http://${baseIp}:${port}/assets/${data3[0].image}`,
                      requiredPercentage: data6[0].c_percentage,
                    },
                  ]);
                });
            }
          } else {
            database
              .select("*")
              .from("students")
              // .join("finance", "students.stu_id", "=", "finance.stu_no")
              .where({
                stu_id: studentNo,
              })
              .then((data2) => {
                if (data2[0]) {
                  database
                    // .orderBy("id")
                    .select("*")
                    .from("fees_structure")
                    .join(
                      "nationality",
                      "fees_structure.nationality_id",
                      "=",
                      "nationality.nationality_id"
                    )
                    .join(
                      "sessions",
                      "fees_structure.session_id",
                      "=",
                      "sessions.session_id"
                    )
                    .join(
                      "schools",
                      "fees_structure.school_id",
                      "=",
                      "schools.school_id"
                    )
                    .join(
                      "levels",
                      "fees_structure.levels_id",
                      "=",
                      "levels.level_id"
                    )
                    .where("sessions.session_name", "=", data2[0].study_time)
                    // .andWhere("schools.school_id", "=", data2[0].school_id)
                    .andWhere(
                      "nationality.nationality_id",
                      "=",
                      data2[0].nationality_id
                    )
                    .andWhere("levels.levels", "=", data2[0].level)
                    .then((data4) => {
                      database
                        .select("*")
                        .from("finance")
                        .where("finance.stu_no", "=", studentNo)
                        .then((data5) => {
                          database
                            .select("*")
                            .from("constraints")
                            .then((data6) => {
                              res.send([
                                ...data2,
                                {
                                  todaysStatus: false,
                                  imageUrl: data2[0]
                                    ? `http://${baseIp}:${port}/assets/${data2[0].image}`
                                    : "http://${baseIp}:${port}/assets/jacket.jpg",
                                  feesStructure: data4,
                                  paid: data5,
                                  percentage:
                                    data2[0] && data5[0]
                                      ? (data5[0].amount / data4[0].tuition) *
                                        100
                                      : 0,
                                  requiredPercentage: data6[0].c_percentage,
                                  paidAmt: data5[0] ? data5[0].amount : 0,
                                  reachedPercentage:
                                    data2[0] && data5[0]
                                      ? (data5[0].amount / data4[0].tuition) *
                                          100 >=
                                        data6[0].c_percentage
                                      : 0 >= data6[0].c_percentage,
                                },
                              ]);
                            });
                        });
                    });
                } else {
                  res.send([
                    {
                      todaysStatus: false,
                      imageUrl: data2[0]
                        ? `http://${baseIp}:${port}/assets/${data2[0].image}`
                        : "http://${baseIp}:${port}/assets/jacket.jpg",
                    },
                  ]);
                }
              });
          }
        });
    });

  // database("students")
  //   .join(
  //     "students_signin_book",
  //     "students.stu_id",
  //     "=",
  //     "students_signin_book.stu_id"
  //   )
  //   .select("*")
  //   // .where("quantity", ">", 0)

  //   .then((data) => {
  //     res.send(data);
  //   });
});

app.get("/lecture/:lecture_id", (req, res) => {
  const { lecture_id } = req.params;
  const userId = 1;
  console.log("number", lecture_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
    .select("*")
    .from("timetable")

    // .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("timetable.tt_id", "=", lecture_id)
    // .andWhere("student_signin.signin_date", "=", date)

    .then((data) => {
      res.send(data);
    });
});

/**
 * You first need to create a formatting function to pad numbers to two digits…
 **/
function twoDigits(d) {
  if (0 <= d && d < 10) return "0" + d.toString();
  if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
  return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlFormat = function () {
  return (
    this.getUTCFullYear() +
    "-" +
    twoDigits(1 + this.getUTCMonth()) +
    "-" +
    twoDigits(this.getUTCDate()) +
    " " +
    twoDigits(this.getUTCHours()) +
    ":" +
    twoDigits(this.getUTCMinutes()) +
    ":" +
    twoDigits(this.getUTCSeconds())
  );
};

app.post("/gateReg", (req, res) => {
  const { gate_id, user_id } = req.body;
  console.log(req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
  console.log(
    "time",
    d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
  );

  database("assigned_gates")
    .insert({
      gate_id,
      user_id,
      date,
      time,
    })
    .then((data) => {
      res.send("Received the data");
    })
    .catch((err) => res.send(err));
});

// app.post("/studentReg", (req, res) => {
//   const { stu_id, temp, signed_in_by } = req.body;
//   console.log(req.body);
//   const d = new Date();
//   const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
//   const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
//   console.log(
//     "time",
//     d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
//   );

//   database("students_signin_book")
//     .insert({
//       stu_id: stu_id,
//       temperature: temp,
//       signin_date: date,
//       signin_time: time,
//       signed_in_by,
//     })
//     .then((data) => {
//       database("students_signout_book")
//         .insert({
//           stu_id: stu_id,
//           signin_date: date,
//         })
//         .then((data2) => {
//           res.send("Received the data");
//         });
//     })
//     .catch((err) => res.send(err));
// });

app.post("/studentReg", (req, res) => {
  const { stu_id, temp, signed_in_by, signed_in, signin_gate } = req.body;
  console.log(req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
  console.log(
    "time",
    d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
  );

  database
    .select("*")
    .from("students")

    .join("student_signin", "students.stu_id", "=", "student_signin.stu_id")

    .where("students.stu_id", "=", stu_id)
    .andWhere("student_signin.signin_date", "=", date)
    .then((data) => {
      if (data.length > 0) {
        database("stu_signin")
          .insert({
            stu_id: stu_id,
            temperature: temp,
            signin_date: date,
            signin_time: time,
            signined_in_by: signed_in,
            signin_gate,
          })
          .then((data) => {
            res.send("Received the data");
            // database("students_signout_book")
            //   .insert({
            //     stu_id: stu_id,
            //     signin_date: date,
            //   })
            //   .then((data2) => {
            //     res.send("Received the data");
            //   });
          })
          .catch((err) => res.send(err));
      } else {
        database("student_signin")
          .insert({
            stu_id: stu_id,
            temperature: temp,
            signin_date: date,
            signin_time: time,
            signed_in_by,
          })
          .then((data) => {
            database("stu_signin")
              .insert({
                stu_id: stu_id,
                temperature: temp,
                signin_date: date,
                signin_time: time,
                signined_in_by: signed_in,
                signin_gate,
              })
              .then((data) => {
                res.send("Received the data");
                // database("students_signout_book")
                //   .insert({
                //     stu_id: stu_id,
                //     signin_date: date,
                //   })
                //   .then((data2) => {
                //     res.send("Received the data");
                //   });
              })
              .catch((err) => res.send(err));

            // database("students_signout_book")
            //   .insert({
            //     stu_id: stu_id,
            //     signin_date: date,
            //   })
            //   .then((data2) => {
            //     res.send("Received the data");
            //   });
          })
          .catch((err) => res.send(err));
      }
    });
});

app.post("/studentSignout/", (req, res) => {
  const { studentNo, signed_in_by, signed_out_by, signin_time, signout_gate } =
    req.body;
  console.log(req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();

  database("stu_signin")
    // .where("stu_id", "=", studentNo)
    .where(function () {
      this.where("stu_id", "=", studentNo);
    })
    .andWhere(function () {
      this.where("signin_date", "=", date);
    })
    .andWhere(function () {
      this.where("signined_in_by", "=", signed_in_by);
    })
    .andWhere(function () {
      this.where("signin_time", "=", signin_time);
    })
    .select("*")
    .update({
      signed_out_by: signed_out_by,
      signout_time: time,
      signout_gate,
    })
    .then((data) => {
      res.send("received the data");
    });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);
  database
    .select("*")
    .where({
      username: username,
      password: password,
    })
    .from("users")
    .then((user) => {
      console.log(user);
      if (!user[0]) {
        return res.status(400).json({ error: "Invalid email or password " });
      } else {
        if (user[0].role == "Student") {
          database
            // .orderBy("id")
            .select("*")
            .from("students")
            .where(function () {
              this.where("stu_id", "=", user[0].stu_no);
            })
            .then((studentData) => {
              database
                // .orderBy("id")
                .select("*")
                .from("stu_selected_course_units")
                .join(
                  "course_units",
                  "stu_selected_course_units.course_id",
                  "=",
                  "course_units.course_id"
                )
                .where(function () {
                  this.where("stu_id", "=", user[0].stu_no);
                })
                .then((courseUnitsData) => {
                  return res.send({
                    ...user[0],
                    otherData: studentData,
                    imageUrl: `http://${baseIp}:${port}/assets/${user[0].user_image}`,
                    studentCourseUnits: courseUnitsData,
                  });
                });
            });
        } else {
          return res.send({
            ...user[0],
            imageUrl: `http://${baseIp}:${port}/assets/${user[0].user_image}`,
          });
        }
      }
      // const token = jwt.sign(
      //   {
      //     id: user[0].id,
      //     email: user[0].email,
      //     name: user[0].username,
      //     address: user[0].address,
      //     fullName: user[0].fullname,
      //     image: user[0].image,
      //   },
      //   secret
      // );
    })
    .catch((err) => {
      return res.status(400).json({ error: "Invalid email or password" });
    });
});

app.post("/api/addVisitor", (req, res) => {
  const { full_name, reason, office, signed_in_by, signin_gate } = req.body;
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  console.log(req.body);
  database("visitors")
    .insert({
      v_full_name: full_name,
      reason,
      office,
      signed_in_by,
      date,
      signin_gate,
    })
    .then((data) => res.status(200).send("Received the data"))
    .catch((err) => res.status(400).send("Failed to send the data " + err));
});

const expressServer = app.listen(port, baseIp, () =>
  console.log(`App is running on port ${port}`)
);

const io = socketio(expressServer);

io.on("connection", (socket) => {
  console.log(`[${socket.id}] socket connected`);

  io.emit("welcome", "Welcome to the socket io server");

  socket.on("thanks", (msg) => {
    console.log(msg);
  });

  socket.on("joinRoom", (roomToJoin) => {
    const roomToLeave = [...socket.rooms][1];
    if (roomToLeave) {
      socket.leave(roomToLeave);
    }
    console.log("Joining room");
    socket.join(roomToJoin);
    console.log([...socket.rooms]);
  });

  socket.on("updateStudentStatusToServer", (data) => {
    console.log("REceiving updates");
    console.log(data);

    database("users")
      .where(function () {
        this.where("stu_no", "=", data.stu_no);
      })
      .update({
        stu_status: data.status ? 1 : 0,
      })
      .then((data) => {
        // res.send("updated the data");
      })
      .catch(
        (err) => {}
        // res.send(err)
      );
    const roomToLeave = [...socket.rooms][1];
    if (roomToLeave) {
      socket.leave(roomToLeave);
    }
    socket.join(data.stu_no);
    const room = [...socket.rooms][1];
    console.log("rooms", room);
    io.in(`${room}`).emit("updateStudentStatus", data);
    // io.emit("updateStudentStatus", data);
  });

  socket.on("lectureHasStarted", (data) => {
    console.log(data);
    database
      .select("*")
      .from("timetable")
      .where("timetable.tt_id", "=", data.lecture_id)
      .then((data2) => {
        // res.send(data);
        console.log(data2[0].c_unit_id);
        socket.join(`${data2[0].c_unit_id}`);

        const room = [...socket.rooms][1];
        io.in(`${room}`).emit("lectureHasStartedFromServer", {
          course_id: data2[0].c_unit_id,
          started: true,
        });
        console.log("rooms", socket.rooms);

        // database
        //   .select("*")
        //   .from("stu_selected_course_units")
        //   .where("stu_selected_course_units.course_id", "=", 9)
        //   .then((data3) => {
        //     console.log("students enrolled in the unit", data3);
        //     data3.forEach((student) => {
        //       socket.join(student.stu_id);
        //     });
        //   });
      });
  });

  // const roomTitle = [...socket.rooms];
  // console.log("rooms", roomTitle);

  // io.of("/")
  //       .to(roomToJoin)
  //       .emit("chatMessageToClients", fullMsg);
});

// io.of("/students").on("connection", (nsSocket) => {
//   console.log(`${nsSocket.id} has joined students namespace`);
// });
