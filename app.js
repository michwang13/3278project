//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const app = express();
const path = require("path");

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

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
  customer_id INT,
  phone_number VARCHAR(255),
  FOREIGN KEY(customer_id) REFERENCES Customer(customer_id)
);

CREATE TABLE if not exists CustomerLoginHistory (
  customer_id INT,
  login_history DATETIME,
  FOREIGN KEY(customer_id) REFERENCES Customer(customer_id)
);

CREATE TABLE if not exists Account (
  account_num INT PRIMARY KEY,
  account_type VARCHAR(255),
  currency VARCHAR(255),
  balance FLOAT(3),
  customer_id  INT,
  FOREIGN KEY(customer_id) REFERENCES Customer(customer_id)
);

CREATE TABLE if not exists Transaction (
  transaction_id INT AUTO_INCREMENT PRIMARY KEY,
  amount FLOAT(3),
  time DATETIME,
  from_account INT,
  to_account INT,
  FOREIGN KEY(from_account) REFERENCES Account(account_num),
  FOREIGN KEY(to_account) REFERENCES Account(account_num)
);
`

// INSERT INTO Transaction (amount,time,from_account,to_account) VALUES 
// (500,"2021-11-14 00:00:00",0,619),
// (1000,"2021-11-12 12:51:03",639,456),
// (1500,"2021-11-15 07:01:02",619,0);
// INSERT INTO Account (account_num,account_type,currency,balance,customer_id) VALUES 
// (123,"Savings","HKD",15000,27),
// (456,"Current","HKD",5000,27),
// (789,"Savings","USD",900,27),
// (000,"Current","USD",200,27);
mysqlConnection.connect((err) => {
  if (!err)
  {
    console.log('Connection Established Successfully');
    mysqlConnection.query(createdb,function(err,result){
      if (!err)
      console.log("Using project database...");
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
  const {username, password} = req.body;

  var verifyUser = `SELECT customer_id FROM Customer WHERE username="${username}" AND password="${password}";`;
  mysqlConnection.query(verifyUser,function(err,result){
    if (!err) {
      if (result.length>0){
        var customer_id = result[0].customer_id;
        var addToLoginHistory = `
        INSERT INTO CustomerLoginHistory VALUES (`+customer_id+`,now()+INTERVAL 8 HOUR);
        UPDATE Customer SET last_login = now()+ INTERVAL 8 HOUR WHERE customer_id =`+customer_id+`;`
        mysqlConnection.query(addToLoginHistory,function(err,result){
          if (!err) {
            console.log("success");
          }
          else
          console.log(err);
        });
        res.redirect(301, `/dashboard/${username}`);
      }
      else{
        console.log("Wrong username and/or password");
        res.render(path.join(__dirname, "views/login.ejs") , {url: '/login', username: req.body.username});
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

app.post("/registration", function(req, res) {
  const {username, password, fullName, birthDate, email, phone} = req.body;
  var registerCustomer = `
  INSERT INTO Customer (name,birthdate,email,last_login,username,password)VALUES ("${fullName}","${birthDate}","${email}","","${username}","${password}");
  `
  mysqlConnection.query(registerCustomer,function(err,result){
    if (!err)
    {
      mysqlConnection.query(`SELECT customer_id FROM Customer WHERE username="${username}";`,function(err,result){
        if (!err)
        {
          var customer_id = result[0].customer_id;
          if (typeof phone === 'string')
          {
            mysqlConnection.query(`INSERT INTO CustomerPhoneNumber VALUES("${customer_id}","${phone}");`,function(err,result){
              if (err)
              console.log(err);
            })
          }
          else
          {
            for (var i=0;i<phone.length;i++){
              var addPhoneNumber = `INSERT INTO CustomerPhoneNumber VALUES("${customer_id}","${phone[i]}");`
              mysqlConnection.query(addPhoneNumber,function(err,result){
                if (err)
                console.log(err);
              });
            }
          }
          res.redirect(301, "/");
        }
      })
    }
    else
    {
      res.render("registration");
      console.log(err);
    }
  });
});

app.get("/dashboard/:username", (req,res) => {
  const{username} = req.params;

  var getUsername = `SELECT customer_id,name,last_login FROM Customer WHERE username="`+username+`";`;
  var name ="";
  var lastLogin="";
  console.log(__dirname);
  mysqlConnection.query(getUsername,function(err,result){
    if (!err)
    {
      name = result[0].name;
      lastLogin = result[0].last_login;
      customer_id = result[0].customer_id;
      mysqlConnection.query(`SELECT account_num,account_type,currency,balance FROM Account WHERE customer_id="${customer_id}";`,function(err,result){
        if (!err)
        {
          var accounts = result;
          var getTransaction = `SELECT * FROM Transaction WHERE from_account IN (SELECT account_num FROM Account WHERE customer_id ="${customer_id}") OR to_account IN (SELECT account_num FROM Account WHERE customer_id="${customer_id}") ORDER BY time desc LIMIT 4;`
          mysqlConnection.query(getTransaction,function(err,result){
            if (!err) {
              var transactions = result;
              res.render(path.join(__dirname, "views/dashboard.ejs"), {username, name, lastLogin: lastLogin, accounts: accounts, transactions: transactions,dir: __dirname});

            }
          })
        }
      })
    }
    else
    console.log(err);
  })
});

app.get("/transactions/:username", (req,res) => {
  const {username} = req.params;
  var getUsername = `SELECT customer_id,name,last_login FROM Customer WHERE username="`+username+`";`;
  var name ="";
  var lastLogin="";
  mysqlConnection.query(getUsername,function(err,result){
    if (!err)
    {
      name = result[0].name;
      lastLogin = result[0].last_login;
      customer_id = result[0].customer_id;
      var getTransactions = `SELECT * FROM Transaction WHERE from_account IN (SELECT account_num FROM Account WHERE customer_id ="${customer_id}") OR to_account IN (SELECT account_num FROM Account WHERE customer_id="${customer_id}") ORDER BY time desc;`
      mysqlConnection.query(getTransactions, function(err, result) {
        var transactions = result;
        res.render(path.join(__dirname, "views/transactions.ejs"), {username:name, lastLogin: lastLogin, transactions:transactions});
      })
    }
    else
    console.log(err);
  })
})

app.get("/profile/:username", (req,res) => {
  const {username} = req.params;
  var getUsername = `SELECT customer_id,name,last_login,birthdate,email,password FROM Customer WHERE username="`+username+`";`;
  var name ="";
  var lastLogin="";
  mysqlConnection.query(getUsername,function(err,result){
    if (!err)
    {
      customer_id = result[0].customer_id;
      name = result[0].name;
      birthdate = result[0].birthdate;
      email = result[0].email;
      lastLogin = result[0].last_login;
      password = "*".repeat(result[0].password.length);
      mysqlConnection.query(`SELECT phone_number from CustomerPhoneNumber WHERE customer_id="${customer_id}";`,function(err,result){
        if (!err)
        // console.log(result);
        res.render(path.join(__dirname, "views/profile.ejs"), {username, name, lastLogin, birthdate, email: email, password:password, numPhone: result});
      })
    }
    else
    console.log(err);
  })
})

app.get("/pay/:username", (req,res) =>{
  const {username} = req.params;
  var getUsername = `SELECT customer_id,name,last_login,birthdate,email,password FROM Customer WHERE username="`+username+`";`;
  var name ="";
  var lastLogin="";
  mysqlConnection.query(getUsername,function(err,result){
    if (!err)
    {
      lastLogin =result[0].last_login;
      mysqlConnection.query(`SELECT customer_id from Customer WHERE username="${username}";`,function(err,result){
        if (!err){
          var customer_id = result[0].customer_id;
          mysqlConnection.query(`SELECT account_num,account_type,currency,balance FROM Account WHERE customer_id="${customer_id}";`,function(err,result){
            var accounts = result;
            res.render(path.join(__dirname, "views/pay.ejs"),{username:username,accounts: accounts, lastLogin:lastLogin});
          })
        }
      })
    }
  })
  

})

app.post("/pay/:username", function(req,res){
  const {username} = req.params;
  const {fromAccount,toAccount,amount} = req.body;
  // var customer_id ="";
  // var accounts;

  mysqlConnection.query(`SELECT customer_id from Customer WHERE username="${username}";`,function(err,result){
    if (!err){
      var customer_id = result[0].customer_id;
      mysqlConnection.query(`SELECT account_num,account_type,currency,balance FROM Account WHERE customer_id="${customer_id}";`,function(err,result){
        var accounts = result;

        var checkBalance = `
        SELECT balance from Account WHERE account_num=${fromAccount};
        `
        mysqlConnection.query(checkBalance, function(err,result){
          if (!err)
          {
            var balance = result[0].balance;
            if (balance < amount)
            {
              console.log("Balance insufficient");
            }
            else
            {
              var checkCurrency= `
              SELECT currency from Account WHERE account_num=${fromAccount} or account_num=${toAccount};
              `
              mysqlConnection.query(checkCurrency,function(err,result){
                if (!err)
                {
                  if (result[0].currency == result[1].currency){
                    var updateBalances = `
                    UPDATE Account SET balance=balance-${amount} WHERE account_num=${fromAccount};
                    UPDATE Account SET balance=balance+${amount} WHERE account_num=${toAccount};
                    INSERT INTO Transaction (amount,time,from_account,to_account) VALUES
                    (${amount}, now() + INTERVAL 8 HOUR,${fromAccount},${toAccount});
                    `
                    mysqlConnection.query(updateBalances,function(err,result){
                      if (err)
                      console.log(err);
                    });
                  }
                  else
                  {
                    console.log("Different currencies");
                  }
                }
              });
            }
          }
        })
        // res.render(path.join(__dirname, "views/pay.ejs"),{username:username,accounts: accounts});
      })
    }
  })

  // var checkBalance = `
  // SELECT balance from Account WHERE account_num=${fromAccount};
  // `
  // mysqlConnection.query(checkBalance, function(err,result){
  //   if (!err)
  //   {
  //     var balance = result[0].balance;
  //     if (balance < amount)
  //     {
  //       console.log("Balance insufficient");
  //     }
  //     else
  //     {
  //       var checkCurrency= `
  //       SELECT currency from Account WHERE account_num=${fromAccount} or account_num=${toAccount};
  //       `
  //       mysqlConnection.query(checkCurrency,function(err,result){
  //         if (!err)
  //         {
  //           if (result[0].currency == result[1].currency){
  //             var updateBalances = `
  //             UPDATE Account SET balance=balance-${amount} WHERE account_num=${fromAccount};
  //             UPDATE Account SET balance=balance+${amount} WHERE account_num=${toAccount};
  //             `
  //             mysqlConnection.query(updateBalances,function(err,result){
  //               if (err)
  //               console.log(err);
  //             });
  //           }
  //           else
  //           console.log("Different currencies");
  //         }
  //       });
  //     }
  //   }
  // })
})

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
