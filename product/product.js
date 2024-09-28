const product = require("express").Router();
const Admin = require("../db/Admin");
const {authenticated} = require("../middleware/auth");
const multer = require("multer")
const upload = require("../utils/multer");
const cloudinary = require("cloudinary").v2;
const Product = require("../models/Product");
const Images = require("../models/Images");
const path = require("path");
const fs = require("fs");
const { pool } = require("../config/config");
const { uploadMultipleImages,uploadImage } = require("../utils/cloudinary");


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// user and admin can see all products
product.get("/",authenticated,async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
  
    const offset = (page - 1) * pageSize;
    const limit = pageSize;
  
    try {
        const query = `
  SELECT 
      p.id AS productId,
      p.name AS productName,
      p."categoryId",
      p."price",
      p."status",
      p."totalStock",
      p."description",
      p."benefits",
      p."howtouse",
      p."ingredients",
      p."createdAt",
      c.name AS categoryName,
      ARRAY_AGG(i."imageUrl") AS images
    FROM products p 
    JOIN categories c ON p."categoryId" = c.id::text::uuid
    LEFT JOIN images i ON i."productId" = p.id::uuid::text
    GROUP BY p.id, c.name
    ORDER BY p."createdAt" DESC
    LIMIT ? OFFSET ?;
`;
// const [products, metadata] = await Product.sequelize.query(query);
//         res.json({status:true,message:"products",products});
        const [results] = await Product.sequelize.query(query, {
            replacements: [limit, offset],
          });
        //   res.json({status:true,message:"products",products:results});
          res.json({
            status: true,
            page,
            pageSize,
            data: results,
          });
      
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
    
    
});

product.get("/details/:productId",authenticated,async(req,res) => {
    try {
        const {productId} = req.params
        const query = `
            SELECT 
            p.id AS productId,
            p.name AS productName,
            p."categoryId",
            p.price,
            p.status,
            p."totalStock",
            p.description,
            p."benefits",
            p."howtouse",
            p."ingredients",
            p."createdAt",
            c.name AS categoryName,
            ARRAY_AGG(i."imageUrl") AS images
            FROM products p
            JOIN categories c ON p."categoryId" = c.id::uuid
            LEFT JOIN images i ON i."productId" = p.id::text  -- Casting p.id to text
            WHERE p.id = ?::uuid
            GROUP BY p.id, c.name
            ORDER BY p."createdAt" DESC;
      `;
              const [[results]] = await Product.sequelize.query(query, {
                  replacements: [productId],
                });
                console.log("🚀 ~ product.get ~ results:", results)
                res.json({ message: 'success', status:true ,results });
                
    } catch (error) {
        res.json({ message: 'failed', status:false ,error });
    }
      
    
})

product.put("/details/:productId", authenticated,async(req,res) => {
    // use raw query to update from database base on the payload sent
    const {productId } = req.params;
    const { name, price, description, categoryId, totalStock,status } = req.body;

    if (!name ||!price ||!description ||!categoryId ||!totalStock) {
        return res.status(400).send({ message: "Please enter all fields" });
    }
    let object = {
    };

    try {
        if (name) {
            object.name = name;
        }
        if (price) {
            object.price = price;
        }
        if (description) {
            object.description = description;
        }
        if (categoryId) {
            object.categoryId = categoryId;
        }
        if (totalStock) {
            object.totalStock = totalStock;
        }
        if (status) {
            object.status = status;
        }

        // const query = `
        //     UPDATE products
        //     SET name =?, price =?, description =?, "categoryId" =?, "totalStock" =?
        //     WHERE id =?::uuid;
        // `;
        //  use sequelize to update the
        const updateProduct = 
            `UPDATE products SET? WHERE id =?::uuid;`
        const [[result]] = await Product.sequelize.query(updateProduct, {replacements: [object,productId]})
      

        

        return res.json({ message: "Product updated successfully", status: true });
    } catch (error) {
        return res.json({ message: error.message, status: false });
    }
})

product.post("/image",upload.single('image'),async (req,res)  => {
    try {
        if (!req.file) {
            return res.json({ message: 'Please Upload a File',status:false });
        }
        console.log("🚀 ~ product.post ~ req.file.path:", req.file.path)
        const results = await cloudinary.uploader.upload(req.file.path,{folder:"beautybytashop"});
        console.log(results)
        return res.json({ message: 'Files uploaded successfully', results });
    } catch (error) {
        return res.json({ message: error.message,status:false });
    }
})

// create a new product by admin only
product.post("/", authenticated, async (req, res) => {
    // console.log("🚀 ~ product.post ~ req.files:", req.files);
    console.log("🚀 ~ product.post ~ req.body:", req.body);

    const { id } = req.user;
    const { name, price, description, categoryId,images,totalStock,benefits,ingredients,howtouse } = req.body;

    if (!name || !price || !description || !images|| !categoryId || !totalStock || !benefits || !ingredients || !howtouse) {
        return res.status(400).send({ message: "Please enter all fields" });
    }

    // const imagePaths = req.files.map(file => file.path);
    if (req.body.images.length === 0) {
        return res.status(400).send('Please send array of images');
    }

    try {

        const newProduct = await Product.create({
            name,
            price:parseFloat(price),
            description:description,
            categoryId,
            totalStock:parseInt(totalStock),
            userId: id,
            benefits,
            ingredients,
            howtouse
        });
        const createImages = images.forEach( async element => {
            return await Images.create({
                productId:newProduct.id,
                imageUrl:element
            })
        });
        // const saveImages = await Images.bulkCreate(images)
        console.log("🚀 ~ product.post ~ saveImages:", createImages)

        res.json({ message: 'Product created successfully', status:true ,newProduct,createImages });
    } catch (error) {
        console.log("🚀 ~ product.post ~ error:", error.stack)
        res.status(500).send({ error: error.message });
    }
});

// update a product by admin only
product.put("/update/:id",authenticated,upload.single("image"),async (req, res) => {
    const {id} = req.session.user
    const {name,price,description,category} = req.body;
    const image = req.file.path;
    const isAdmin = await Admin.findById(id);
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
    const {id} = req.session.user
    const isAdmin = await Admin.findById(id);
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
