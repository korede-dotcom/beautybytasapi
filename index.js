const express = require("express");

const cors = require("cors");
const connectDB = require("./db/db.js")();
require("dotenv").config();
const session = require("express-session");
const MongoStore = require("connect-mongodb-session")(session);
const cookeParser = require("cookie-parser");
const User = require("./db/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = require("./auth/auth.js");
const product = require("./product/product.js");

const app = express();

app.use(cors());



const store = new MongoStore({
    uri:  process.env.MONGO_URI,
    collection: "sessions"
});

app.use(session({
    secret: process.env.SS,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 1 
    },
    store: store
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookeParser())
app.use(router)
app.use("/product",product);











// validate req.body on /test route with express-validator






app.listen(3200, () => {
    console.log("Server running on port 3200");
    });

