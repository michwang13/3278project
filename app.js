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
  multipleStatements: true
});

var createdb = `
use project;
CREATE TABLE if not exists Customer (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  birthdate VARCHAR(255),
  email VARCHAR(255),
  last_login TIMESTAMP,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE if not exists CustomerPhoneNumber (
  customer_id INT PRIMARY KEY,
  phone_number VARCHAR(255),
  FOREIGN KEY(customer_id) REFERENCES Customer(customer_id)
);

CREATE TABLE if not exists CustomerLoginHistory (
  customer_id INT PRIMARY KEY,
  login_history DATETIME,
  FOREIGN KEY(customer_id) REFERENCES Customer(customer_id)
);

CREATE TABLE if not exists Account (
  account_num INT AUTO_INCREMENT PRIMARY KEY,
  account_type VARCHAR(255),
  currency VARCHAR(255),
  balance FLOAT(3),
  customer_id  INT,
  FOREIGN KEY(customer_id) REFERENCES Customer(customer_id)
);

CREATE TABLE if not exists Transaction (
  transaction_id INT PRIMARY KEY,
  amount FLOAT(3),
  time DATETIME,
  from_account INT,
  to_account INT,
  FOREIGN KEY(from_account) REFERENCES Account(account_num),
  FOREIGN KEY(to_account) REFERENCES Account(account_num)
);
`
mysqlConnection.connect((err) => {
  if (!err)
  {
    console.log('Connection Established Successfully');
    mysqlConnection.query(createdb,function(err,result){
      if (!err)
      console.log("Successfully created table");
      else
      console.log(err);
    })
  }
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

  var verifyUser = `SELECT username FROM Customer WHERE username="`+username+`" AND password="`+password+`";`
  mysqlConnection.query(verifyUser,function(err,result){
    if (!err) {
      if (result.length>0){
        res.redirect(301, `/dashboard/${username}`);
      }
      else{
        console.log("Wrong username and/or password");
        res.render(path.join(__dirname, "views/login.ejs") , {url: '/login'});
      }
    }
    else{
      console.log(err);
    }
  })
});

app.get("/registration", function(req, res) {
  res.render("registration");
});

app.get("/dashboard/:username", (req,res) => {
  // console.log(req.params);
  const{username} = req.params;
  // console.log("username", username);

  var getUsername = `SELECT name FROM Customer WHERE username="`+username+`";`;
  var name ="";

  mysqlConnection.query(getUsername,function(err,result){
    if (!err)
    {
      name = result[0].name;
      console.log(name);
      res.render(path.join(__dirname, "views/dashboard.ejs"), {username:name});
    }
    else
    console.log(err);
  })
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
