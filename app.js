//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const app = express();
const path = require("path");

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

var mysqlConnection = mysql.createConnection({
  host: 'project3278.cl8tabhuzbu5.us-east-2.rds.amazonaws.com',
  port: '3306',
  user: 'admin',
  password: '12345678',
  // database: 'learner',
  // multipleStatements: true
});

mysqlConnection.connect((err) => {
  if (!err)
    console.log('Connection Established Successfully');
  else
    console.log('Connection Failed!' + JSON.stringify(err, undefined, 2));
});


app.get("/", function (req, res) {
  res.render(path.join(__dirname, "views/login.ejs") , {url: '/login'});
});

app.post('/login', (req, res) => {
  // const username="RR";
  // const password="BBB";
  const {username, password} = req.body;
  console.log(req.body);
  // console.log(req);
  // if (false)
  res.redirect(301, `/dashboard/${username}`);
});

app.get("/registration", function(req, res) {
  res.render("registration");
});

app.get("/dashboard/:username", (req,res) => {
  const{username} = req.params;
  console.log("username", username);
  res.render(path.join(__dirname, "views/dashboard.ejs"), {username:username});
});

// app.get("/:customListName", function (req, res) {
//   const customListName = _.capitalize(req.params.customListName);

//   List.findOne({ name: customListName }, function (err, foundList) {
//     if (!err) {
//       if (!foundList) {
//         //Create a new list
//         const list = new List({
//           name: customListName,
//           items: defaultItems
//         });
//         list.save();
//         res.redirect("/" + customListName);
//       } else {
//         //Show an existing list

//         res.render("contoh", { listTitle: foundList.name, newListItems: foundList.items });
//       }
//     }
//   });
// });

// app.post("/", function (req, res) {

//   const itemName = req.body.newItem;
//   const listName = req.body.list;

//   const item = new Item({
//     name: itemName
//   });

//   if (listName === "Today") {
//     item.save();
//     res.redirect("/");
//   } else {
//     List.findOne({ name: listName }, function (err, foundList) {
//       foundList.items.push(item);
//       foundList.save();
//       res.redirect("/" + listName);
//     });
//   }
// });

// app.get("/about", function (req, res) {
//   res.render("about");
// });

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
