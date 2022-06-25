const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const knex = require("knex");
const { response } = require("express");
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
];

data.map((item) =>
  app.get(`/${item}`, (req, res) => {
    database
      .orderBy("id")
      .select("*")
      .from(item)
      .then((data) => {
        res.send(data);
      });
  })
);

app.get("/visitorData", (req, res) => {
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
    .orderBy("time", "desc")
    .select("*")
    .then((data) => {
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

app.get("/myStudents/:student_id", (req, res) => {
  const { student_id } = req.params;
  console.log(student_id);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database("students_signin_book")
    .join(
      "users",
      "students_signin_book.signed_in_by",

      "=",
      "users.id"
    )
    .where("students_signin_book.signin_date", "=", date)
    .select("*")
    .where({
      signed_in_by: student_id,
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

app.get("/student/:studentNo", (req, res) => {
  const { studentNo } = req.params;
  console.log(studentNo);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  database
    .select("*")
    .from("students_signin_book")
    .where({
      stu_id: studentNo,
      signin_date: date,
    })
    .then((data) => {
      // res.send(data);
      if (data.length > 0) {
        database
          .select("*")
          .from("students")

          .join(
            "students_signin_book",
            "students.stu_id",
            "=",
            "students_signin_book.stu_id"
          )

          .join(
            "students_signout_book",
            "students.stu_id",
            "=",
            "students_signout_book.stu_id"
          )
          .where("students.stu_id", "=", studentNo)
          .andWhere("students_signout_book.signin_date", "=", date)
          .then((data3) => {
            // res.send(data3);
            if (data3[0].sign_out !== null) {
              res.send("Already registered");
            } else {
              res.send([
                data3[0],
                {
                  todaysStatus: true,
                  imageUrl: `https://floating-retreat-56097.herokuapp.com/assets/${data3[0].image}`,
                },
              ]);
            }
          });
      } else {
        database
          .select("*")
          .from("students")
          .where({
            stu_id: studentNo,
          })
          .then((data2) => {
            res.send([
              ...data2,
              {
                todaysStatus: false,
                imageUrl: data2[0]
                  ? `https://floating-retreat-56097.herokuapp.com/assets/${data2[0].image}`
                  : "https://floating-retreat-56097.herokuapp.com/assets/jacket.jpg",
              },
            ]);
          });
      }
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

app.post("/studentReg", (req, res) => {
  const { stu_id, temp, signed_in_by } = req.body;
  console.log(req.body);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
  console.log(
    "time",
    d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
  );

  database("students_signin_book")
    .insert({
      stu_id: stu_id,
      temperature: temp,
      signin_date: date,
      signin_time: time,
      signed_in_by,
    })
    .then((data) => {
      database("students_signout_book")
        .insert({
          stu_id: stu_id,
          signin_date: date,
        })
        .then((data2) => {
          res.send("Received the data");
        });
    })
    .catch((err) => res.send(err));
});

app.post("/studentSignout/:studentNo", (req, res) => {
  const { studentNo } = req.params;
  console.log(studentNo);
  const d = new Date();
  const date = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const time = d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();

  database("students_signout_book")
    // .where("stu_id", "=", studentNo)
    .where(function () {
      this.where("stu_id", "=", studentNo);
    })
    .andWhere(function () {
      this.where("signin_date", "=", date);
    })
    .update({
      sign_out: new Date().toMysqlFormat(),
      signout_date: date,
      signout_time: time,
    })
    .then((data) => {
      res.send("received timestamop");
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
        return res.send({
          ...user[0],
          imageUrl: `https://floating-retreat-56097.herokuapp.com/assets/${user[0].image}`,
        });
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
  const { full_name, reason, office, signed_in_by } = req.body;
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
    })
    .then((data) => res.status(200).send("Received the data"))
    .catch((err) => res.status(400).send("Failed to send the data " + err));
});

app.listen(port, baseIp, () => console.log(`App is running on port ${port}`));
