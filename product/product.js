const product = require("express").Router();
const Admin = require("../db/Admin");
const {authenticated} = require("../middleware/auth");
const multer = require("multer")
const {upload} = require("../utils/multer");
const cloudinary = require("cloudinary").v2;
const Product = require("../db/Product");
const path = require("path");
const fs = require("fs");

cloudinary.config({
    cloud_name: process.env.c_Name,
    api_key: process.env.c_Key,
    api_secret: process.env.c_Secret,
});

// cloudinary change folder name

// user and admin can see all products
product.get("/",authenticated,async (req, res) => {
    try {
        const products = await Product.find({});
        res.send({products,status:"success"});
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
    
    
});


// create a new product by admin only
product.post("/create",authenticated,upload.single("image"),async (req, res) => {
    const {_id} = req.session.user
    const {name,price,description,category} = req.body;
    const image = req.file.path;
    const isAdmin = await Admin.findById(_id);
    if(!isAdmin){
        return res.status(400).send({msg:"You are not an admin"})
    }
    if(!name || !price || !description || !image){
        return res.status(400).send({msg:"Please enter all fields"})
    }
    try{
    const result = await cloudinary.uploader.upload(req.file.path,{folder:"beautybytashop"});
    const newProduct = new Product({
        name,
        price,
        description,
        category,
        image: result.url
    });
    await newProduct.save();
    res.send({ status: "success" });
      await fs.unlinkSync(image);
    }catch(error){
        await fs.unlinkSync(image);
        res.status(500).send({error:error.message})
    }
});


// update a product by admin only
product.put("/update/:id",authenticated,upload.single("image"),async (req, res) => {
    const {_id} = req.session.user
    const {name,price,description,category} = req.body;
    const image = req.file.path;
    const isAdmin = await Admin.findById(_id);
    if(!isAdmin){
        return res.status(400).send({msg:"You are not an admin"})
    }
    if(!name || !price || !description || !image){
        return res.status(400).send({msg:"Please enter all fields"})
    }
    try{
    const result = await cloudinary.uploader.upload(req.file.path,{folder:"beautybytashop"});
    const product = await Product.findById(req.params.id);
    product.name = name;
    product.price = price;
    product.description = description;
    product.category = category;
    product.image = result.url;
    await product.save();
    res.send({ status: "success" });
    fs.unlinkSync(image);
    }
    catch(error){
          fs.unlinkSync(image);
        res.status(500).send({error:error.message})
    }
});


// delete a product by admin only
product.get("/delete/:id",authenticated,async (req, res) => {
    const {_id} = req.session.user
    const isAdmin = await Admin.findById(_id);
    if(!isAdmin){
        return res.status(400).send({msg:"You are not an admin"})
    }
    try {
        const product = await Product.findById(req.params.id);
        await product.remove();
        res.send({ status: "success" });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});






module.exports = product;
