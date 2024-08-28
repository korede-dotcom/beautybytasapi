const router = require("express").Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Admin = require("../db/Admin");

router.post("/signup", async (req, res) => {
    const { name, email, password,phone,address } = req.body;
    if (!name || !email || !password) {
        return res.status(400).send({ msg: "Please enter all fields" });
    }
    try {
        const user = await User.findOne({ where:{ email:email} });
        if (user) {
            return res.status(400).json({
                msg: "User already exists"
            });
        }
        const newUser = new User({
            name,
            email,
            phone,
            address,
            password: bcrypt.hashSync(password, 10)
        });
        await newUser.save();
      
        req.session.user = user;
        res.send({
            msg: "User created successfully",
            status: "success"
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
        
    }
    
})

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