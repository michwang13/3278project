//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const app = express();
const path = require("path");
const {spawn} = require('child_process');

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
`;

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
    });
  }
  else
    console.log('Connection Failed!' + JSON.stringify(err, undefined, 2));
});

app.get("/", function (req, res) {
  // const python = spawn('python', ['face_capture.py', 'buntoro', 2]);

  // python.on('exit', function() {
  //   spawn('python', ['train.py'])
  // })
  spawn('python', ['train.py']);
  console.log('register');
  res.render(path.join(__dirname, "views/login.ejs") , {url: '/login',alert:"False"});
});

app.get('/face', (req, res) => {
  const { spawn } = require('child_process');
  const python = spawn('python', ['faces.py', 'buntoro', 2]);

  // python.on('exit', function() {
  //     spawn('python', ['train.py', 'buntoro', 2])
  // })
  let result;
  python.stdout.on('data', (data) => {
      // console.log('pattern: ', data.toString());
      result = data.toString();
      });
  python.stderr.on('data', (data) => {
  console.error('err: ', data.toString());
  });

  python.on('error', (error) => {
  console.error('error: ', error.message);
  });

  python.on('close', (code) => {
  console.log('child process exited with code ', code);
  });

  python.on('exit', function() {
    console.log("Result" + result);
    username = result.toLowerCase();
    // console.log("Manjuy " +username)
    var getPass =  `SELECT username, password FROM Customer WHERE username="${username}";`;
    console.log(getPass);
    mysqlConnection.query(getPass, function(err, result) {
      if(!err) {
        let username = result[0].username;
        let password = result[0].password;
        console.log(username, password);
        res.render(path.join(__dirname, "views/login.ejs"), {url: '/login', username, password, alert:"False"});
      }
      else {
        console.log(err);
      }
    })
  })
})


app.post('/login', (req, res) => {
  const {username, password} = req.body;

  var verifyUser = `SELECT customer_id FROM Customer WHERE username="${username}" AND BINARY password="${password}";`;
  mysqlConnection.query(verifyUser,function(err,result){
    if (!err) {
      if (result.length>0){
        var customer_id = result[0].customer_id;
        var addToLoginHistory = `
        INSERT INTO CustomerLoginHistory VALUES (`+customer_id+`,now()+INTERVAL 8 HOUR);
        UPDATE Customer SET last_login = now()+ INTERVAL 8 HOUR WHERE customer_id =`+customer_id+`;`;
        mysqlConnection.query(addToLoginHistory,function(err,result){
          if (!err) {
            console.log("Succesfully added to login history");
          }
          else
          console.log(err);
        });
        res.redirect(301, `/dashboard/${username}`);
      }
      else{
        console.log("Wrong username and/or password");
        res.render(path.join(__dirname, "views/login.ejs") , {url: '/login', username: req.body.username,alert:"True"});
      }
    }
    else{
      console.log(err);
    }
  });
});

app.get("/registration", function(req, res) {
  res.render("registration",{alert:"False"});
});

app.post("/registration", function(req, res) {
  const {username, password, fullName, birthDate, email, phone} = req.body;

  var phoneList = phone.split(",");
  var registerCustomer = `
  INSERT INTO Customer (name,birthdate,email,last_login,username,password)VALUES ("${fullName}","${birthDate}","${email}","","${username}","${password}");
  `;
  mysqlConnection.query(registerCustomer,function(err,result){
    if (!err)
    {
      mysqlConnection.query(`SELECT customer_id FROM Customer WHERE username="${username}";`,function(err,result){
        if (!err)
        {
          var customer_id = result[0].customer_id;
          for (var i=0;i<phoneList.length;i++){
            var addPhoneNumber = `INSERT INTO CustomerPhoneNumber VALUES("${customer_id}","${phoneList[i]}");`;
            mysqlConnection.query(addPhoneNumber,function(err,result){
              if (err)
              console.log(err);
            });
          }
          // const python = spawn('python', ['face_capture.py', username, 2]);
          // python.on('exit', function() {
          //   spawn('python', ['train.py'])
          // })
          // console.log('register');
          const python = spawn('python', ['face_capture.py', username, 2]);
          console.log('register');
          res.redirect(301, "/");
        }
      });
    }
    else
    {
      res.render("registration",{alert:"True"});
      console.log(err);
    }
  });
});

app.get("/dashboard/:username", (req,res) => {
  const{username} = req.params;

  var getUsername = `SELECT customer_id,name,last_login FROM Customer WHERE username="`+username+`";`;
  var name ="";
  var lastLogin="";
  // console.log(__dirname);
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
          var getTransaction = `SELECT T1.from_account, T1.to_account, T1.amount, T1.time, C1.name AS nameFrom, C2.name as nameTo FROM (SELECT *FROM Transaction WHERE from_account IN (SELECT account_num FROM Account WHERE customer_id ="${customer_id}") OR to_account IN (SELECT account_num FROM Account WHERE customer_id="${customer_id}") ORDER BY time desc LIMIT 4)T1, Account A1, Account A2, Customer C1, Customer C2
          WHERE T1.from_account=A1.account_num AND T1.to_account=A2.account_num AND A1.customer_id=C1.customer_id AND A2.customer_id=C2.customer_id;`;
          mysqlConnection.query(getTransaction,function(err,result){
            if (!err) {
              var transactions = result;
              // console.log(transactions);
              res.render(path.join(__dirname, "views/dashboard.ejs"), {username, name, lastLogin: lastLogin, accounts: accounts, transactions: transactions,dir: __dirname});

            }
          });
        }
      });
    }
    else
    console.log(err);
  });
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
      var getTransactions = `SELECT T1.from_account, T1.to_account, T1.amount, T1.time, C1.name AS nameFrom, C2.name as nameTo FROM (SELECT *FROM Transaction WHERE from_account IN (SELECT account_num FROM Account WHERE customer_id ="${customer_id}") OR to_account IN (SELECT account_num FROM Account WHERE customer_id="${customer_id}") ORDER BY time desc)T1, Account A1, Account A2, Customer C1, Customer C2
          WHERE T1.from_account=A1.account_num AND T1.to_account=A2.account_num AND A1.customer_id=C1.customer_id AND A2.customer_id=C2.customer_id ORDER BY T1.time desc;`;
      var maxTransactionSQL = `SELECT MAX(amount) AS max_amount FROM Transaction WHERE from_account IN (SELECT account_num FROM Account WHERE customer_id ="${customer_id}") OR to_account IN (SELECT account_num FROM Account WHERE customer_id="${customer_id}") ORDER BY time desc;`;
      var minTransactionSQL = `SELECT MIN(amount) AS min_amount FROM Transaction WHERE from_account IN (SELECT account_num FROM Account WHERE customer_id ="${customer_id}") OR to_account IN (SELECT account_num FROM Account WHERE customer_id="${customer_id}") ORDER BY time desc;`;
      var maxDateSQL = `SELECT MAX(time) AS max_time FROM Transaction WHERE from_account IN (SELECT account_num FROM Account WHERE customer_id ="${customer_id}") OR to_account IN (SELECT account_num FROM Account WHERE customer_id="${customer_id}") ORDER BY time desc;`;
      var minDateSQL = `SELECT MIN(time) AS min_time FROM Transaction WHERE from_account IN (SELECT account_num FROM Account WHERE customer_id ="${customer_id}") OR to_account IN (SELECT account_num FROM Account WHERE customer_id="${customer_id}") ORDER BY time desc;`;
      mysqlConnection.query(getTransactions+maxTransactionSQL+minTransactionSQL+maxDateSQL+minDateSQL, function(err, result) {
        var transactions = result[0];
        // console.log(transactions);
        var maxTransaction = result[1][0].max_amount;
        var minTransaction = result[2][0].min_amount;
        var maxTime = result[3][0].max_time.toString();
        maxTime = new Date(maxTime);
        maxTime = `${maxTime.getFullYear()}-${maxTime.getMonth()+1}-${maxTime.getDate()}`;
        var minTime = result[4][0].min_time.toString();
        minTime = new Date(minTime);
        minTime = `${minTime.getFullYear()}-${minTime.getMonth()+1}-${minTime.getDate()}`;
        res.render(path.join(__dirname, "views/transactions.ejs"), {username, lastLogin, transactions, maxTransaction, minTransaction, maxTime, minTime});
        
      });
      // mysqlConnection.query(maxTransactionSQL, function(err, result) {
      //   var maxTransaction = result;
        
      // })
      
    }
    else
    console.log(err);
  });
});

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
        res.render(path.join(__dirname, "views/profile.ejs"), {username, name, lastLogin, birthdate, email: email, password:password, numPhone: result});
      });
    }
    else
    console.log(err);
  });
});

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
            res.render(path.join(__dirname, "views/pay.ejs"),{username:username,accounts: accounts, lastLogin:lastLogin,alert:"False"});
          });
        }
      });
    }
  });
  

});

app.post("/pay/:username", function(req,res){
  const {username} = req.params;
  const {fromAccount,toAccount,amount} = req.body;
  // var customer_id ="";
  // var accounts;

  mysqlConnection.query(`SELECT customer_id,last_login from Customer WHERE username="${username}";`,function(err,result){
    if (!err){
      var customer_id = result[0].customer_id;
      var lastLogin = result[0].last_login;
      mysqlConnection.query(`SELECT account_num,account_type,currency,balance FROM Account WHERE customer_id="${customer_id}";`,function(err,result){
        var accounts = result;

        var checkBalance = `
        SELECT balance from Account WHERE account_num=${fromAccount};
        `;
        mysqlConnection.query(checkBalance, function(err,result){
          if (!err)
          {
            var balance = result[0].balance;
            if (balance < amount)
            {
              console.log("Balance insufficient");
              res.render(path.join(__dirname, "views/pay.ejs"),{username:username,accounts: accounts, lastLogin:lastLogin,alert:"Insufficient balance to complete transaction..."});

            }
            else
            {
              var checkCurrency= `
              SELECT currency from Account WHERE account_num=${fromAccount} or account_num=${toAccount};
              `;
              mysqlConnection.query(checkCurrency,function(err,result){
                if (!err)
                {
                  if (result[0].currency == result[1].currency){
                    var updateBalances = `
                    UPDATE Account SET balance=balance-${amount} WHERE account_num=${fromAccount};
                    UPDATE Account SET balance=balance+${amount} WHERE account_num=${toAccount};
                    INSERT INTO Transaction (amount,time,from_account,to_account) VALUES
                    (${amount}, now() + INTERVAL 8 HOUR,${fromAccount},${toAccount});
                    `;
                    mysqlConnection.query(updateBalances,function(err,result){
                      if (!err)
                      {
                        console.log("Transaction success");
                        res.render(path.join(__dirname, "views/pay.ejs"),{username:username,accounts: accounts, lastLogin:lastLogin,alert:"Transaction completed!"});
                      }
                    });
                  }
                  else
                  {
                    alert("Transaction Failed");
                    console.log("Different currencies");
                    res.render(path.join(__dirname, "views/pay.ejs"),{username:username,accounts: accounts, lastLogin:lastLogin,alert:"Currency incompatible to complete transaction..."});

                  }
                }
              });
            }
          }
        });
      });
    }
  });
});

app.get("/password/:username",function(req,res){
  const {username} = req.params;
  // console.log(req.body);
  mysqlConnection.query(`SELECT last_login FROM Customer WHERE username="${username}";`,function(err,result){
    if (!err)
    {
      var lastLogin = result[0].last_login;
      res.render(path.join(__dirname, "views/password.ejs"),{username,lastLogin,alert:""});
    }
  })
});

app.post("/password/:username",function(req,res){
  const {username} = req.params;
  const {currentPassword,newPassword} = req.body;

  mysqlConnection.query(`SELECT last_login,password from Customer where username = "${username}";`,function(err,result){
    if (!err) {
      var lastLogin = result[0].last_login;
      var validPassword = result[0].password;
      if (currentPassword === validPassword)
      {
        mysqlConnection.query(`UPDATE Customer SET password="${newPassword}" WHERE username="${username}";`,function(err,result){
          if (!err){
            console.log("Password updated");
            res.render(path.join(__dirname, "views/password.ejs"),{username,lastLogin,alert:"updated"});
          }
        })
      }
      else
      {
        console.log("The current password you entered is incorrect");
        res.render(path.join(__dirname, "views/password.ejs"),{username,lastLogin,alert:"not updated"});
      }
    }
  })

})




app.listen(3000, function () {
  console.log("Server started on port 3000");
});
