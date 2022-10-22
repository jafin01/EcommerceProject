const express = require('express');
const db = require('./server/database/connection')
const dotenv = require('dotenv');
const sessions = require('express-session')
const userRouter = require('./server/routes/userRouter')
const adminRouter = require('./server/routes/adminRouter')
const Paypal = require('paypal-rest-sdk');

//app init and middleware
const app = express();
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }))
app.use(sessions({
    secret: 'verygoodpassword',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 6000000 }
}))

app.use(function (req, res, next) {
    res.set('cache-control', 'no-cache , no-store,must-revalidate,max-stale=0,post-check=0,pre-checked=0');
    next();
});


dotenv.config({ path: "config.env" })
const PORT = process.env.PORT || 8080;

//setting view engine
app.set('view engine', 'ejs');

//listening to port



db.connectToDb((err) => {
    if (!err) {
        app.listen(PORT, () => {
            console.log(`listening to port ${PORT}`)
        })
    }
});

app.use(userRouter);
app.use(adminRouter);




