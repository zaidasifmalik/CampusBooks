const express = require('express');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const fileUpload = require('express-fileupload');
app.use(fileUpload());
app.use(cookieParser());
app.use(session({
    resave:true,
    saveUninitialized:true,
    secret:"secret"
}))
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`listening on port ${PORT}`));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));

app.engine('hbs', exphbs.engine({extname: '.hbs'}));
app.set('view engine','hbs');

const routes = require('./server/routes/user');
app.use('/', routes);

const pool = mysql.createPool({
    connectionLimit : 100,
    host : process.env.DB_HOST,
    user : process.env.DB_USER,
    password : process.env.DB_PASS,
    database : process.env.DB_NAME
});

pool.getConnection((err,connection) => {
    if(err) throw err;
    console.log('connected as ID ' + connection.threadId);
});