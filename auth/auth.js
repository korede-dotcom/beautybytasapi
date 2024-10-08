const router = require("express").Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Admin = require("../db/Admin");
const Customer = require("../models/Customer");
const connectDB = require("../config/connectDB");
const expressAsyncHandler = require("express-async-handler");

router.post("/signup", expressAsyncHandler(async (req, res) => {
    const { name, email, password,phonenumber,address } = req.body;
    if (!name || !email || !password) {
        return res.status(400).send({ msg: "Please enter all fields" });
    }
    let transaction;
    transaction = await connectDB.transaction();
    try {
        const user = await User.findOne({ where:{ email:email} });
        if (user) {
            transaction.rollback()
            return res.status(400).json({
                msg: "User already exists"
            });

        }
        const newUser = await User.create({
            name,
            email,
            password: bcrypt.hashSync(password, 10),
            roleId:2
        },{transaction});
        const newCustomer = await Customer.create({
            address:address,
            userId: newUser.id,
            phonenumber:phonenumber
        },{transaction});

      transaction.commit();
        // req.session.user = user;
        return res.status(201).json({
            message: "User created successfully",
            status: "success"
        });
        
    } catch (error) {
        transaction.rollback();
        res.status(500).json({
            message: error.message
        });
        
    }
    
}))

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send({ msg: "Please enter all fields" });
    }
    try {
        const user = await User.findOne({
            where: { email: email},
            // attributes: { exclude: ['password'] }
          });
          
        if (!user) {
            return res.status(400).json({
                status: false,message:"Invalid credentials" 
            });
        }
        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                status: false,message:"Invalid credentials"
            });
        }
       const token = await jwt.sign({id:user.id},process.env.JWT_SECRET,{expiresIn:"24h"})
       
 
        // req.session.user = user;
        res.send({ status: true,message:"success", user,token });
        // send token to client
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});



// create admin
// router.post("/admin",(req,res)=>{
//     const {email,password,name} = req.body;
//     if(!email || !password || !name){
//         return res.status(400).send({msg:"Please enter all fields"});
//     }
//     const newAdmin = new Admin({
//         name,
//         email,
//         password:bcrypt.hashSync(password,10),
//         role:1,
//     });
//     req.session.user = newAdmin;
//     newAdmin.save()

//     .then(()=>{
//         res.send({status:"success"})
//     })
//     .catch(error=>{
//         res.status(500).send({error:error.message})
//     })
// }
// )


router.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send({ msg: "Error logging out" });
        }
        res.send({ msg: "Logged out" });
    });
});


module.exports = router;