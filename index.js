const express = require("express");

const cors = require("cors");
require("dotenv").config();
const session = require("express-session");
const MongoStore = require("connect-mongodb-session")(session);
const cookeParser = require("cookie-parser");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const authRouter = require("./auth/auth.js");
const categoryRouter = require("./category/category.js");
const customerRouter = require("./customer/customer.js");
const blogsRouter = require("./blogs/blogs.js");
const ordersRouter = require("./orders/order.js");
const productRouter = require("./product/product.js");
const cartRouter = require("./cart/cart.js");
const product = require("./models/Product.js");
const User = require("./models/User.js");
const connectDB = require("./config/connectDB");


const app = express();

// app.use(cors({
//   origin: 'http://localhost:3000'
// }));

app.use(cors());

(async () => {
    await connectDB
      .authenticate()
      .then(() => {

    async function seed () {
        
        const seedAdmin = await User.findOne({where:{roleId:1}})
        const hashed = await bcrypt.hash(process.env.adminPassword,10)
        if (!seedAdmin) {
            const createAdmin = await User.create({roleId:1,email:process.env.adminEmail,password:hashed,name:process.env.adminName})
            console.log("🚀 ~ seed ~ createAdmin:", createAdmin)
        }
    }
        seed()
      })
      .catch((err) => {
        console.log(err);
      });
})();



app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookeParser())
// app.use(router)



app.use("/product",productRouter);
app.use("/auth",authRouter);
app.use("/category",categoryRouter);
app.use("/customers",customerRouter);
app.use("/blogs",blogsRouter);
app.use("/orders",ordersRouter);
app.use("/cart", cartRouter);











// validate req.body on /test route with express-validator






app.listen(3200, () => {
    console.log("Server running on port 3200");
    });

