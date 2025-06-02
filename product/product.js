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
const { QueryTypes } = require('sequelize');


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
product.get("/details/client/:productId",async(req,res) => {
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

// Get best selling products
product.get("/best-selling", async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id AS "productId",
                p.name AS "productName",
                p."categoryId",
                p.price,
                p.status,
                p."totalStock",
                p.description,
                p."benefits",
                p."howtouse",
                p."ingredients",
                p."createdAt",
                c.name AS "categoryName",
                ARRAY_AGG(DISTINCT i."imageUrl") AS images,
                COALESCE(SUM(o.quantity), 0) as "totalSold",
                COALESCE(COUNT(DISTINCT o.id), 0) as "orderCount"
            FROM products p 
            JOIN categories c ON p."categoryId" = c.id::text::uuid
            LEFT JOIN images i ON i."productId" = p.id::uuid::text
            LEFT JOIN orders o ON o."productId" = p.id::text AND o.status = 'success'
            WHERE p.status = true
            GROUP BY p.id, c.name
            HAVING COALESCE(SUM(o.quantity), 0) > 0
            ORDER BY "totalSold" DESC, "orderCount" DESC
            LIMIT 10;
        `;

        const products = await Product.sequelize.query(query, {
            type: QueryTypes.SELECT
        });

        res.json({
            status: true,
            message: "Best selling products retrieved successfully",
            data: products
        });
    } catch (error) {
        console.error("Best selling products error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get new products
product.get("/new", async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id AS "productId",
                p.name AS "productName",
                p."categoryId",
                p.price,
                p.status,
                p."totalStock",
                p.description,
                p."benefits",
                p."howtouse",
                p."ingredients",
                p."createdAt",
                c.name AS "categoryName",
                ARRAY_AGG(DISTINCT i."imageUrl") AS images,
                COALESCE(SUM(o.quantity), 0) as "totalSold"
            FROM products p 
            JOIN categories c ON p."categoryId" = c.id::text::uuid
            LEFT JOIN images i ON i."productId" = p.id::uuid::text
            LEFT JOIN orders o ON o."productId" = p.id::text AND o.status = 'success'
            WHERE p.status = true
            GROUP BY p.id, c.name
            ORDER BY p."createdAt" DESC
            LIMIT 10;
        `;

        const products = await Product.sequelize.query(query, {
            type: QueryTypes.SELECT
        });

        res.json({
            status: true,
            message: "New products retrieved successfully",
            data: products
        });
    } catch (error) {
        console.error("New products error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get almost sold out products
product.get("/almost-sold-out", async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id AS "productId",
                p.name AS "productName",
                p."categoryId",
                p.price,
                p.status,
                p."totalStock",
                p.description,
                p."benefits",
                p."howtouse",
                p."ingredients",
                p."createdAt",
                c.name AS "categoryName",
                ARRAY_AGG(DISTINCT i."imageUrl") AS images,
                COALESCE(SUM(o.quantity), 0) as "totalSold",
                CASE 
                    WHEN p."totalStock" <= 5 THEN 'Low Stock'
                    WHEN p."totalStock" <= 10 THEN 'Medium Stock'
                    ELSE 'In Stock'
                END as "stockStatus"
            FROM products p 
            JOIN categories c ON p."categoryId" = c.id::text::uuid
            LEFT JOIN images i ON i."productId" = p.id::uuid::text
            LEFT JOIN orders o ON o."productId" = p.id::text AND o.status = 'success'
            WHERE p.status = true 
            AND p."totalStock" <= 10
            GROUP BY p.id, c.name
            ORDER BY p."totalStock" ASC, "totalSold" DESC;
        `;

        const products = await Product.sequelize.query(query, {
            type: QueryTypes.SELECT
        });

        res.json({
            status: true,
            message: "Almost sold out products retrieved successfully",
            data: products
        });
    } catch (error) {
        console.error("Almost sold out products error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Admin Dashboard Analytics
product.get("/dashboard", authenticated, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.roleId !== 1) {
            return res.status(403).json({
                status: false,
                message: "Access denied. Admin only."
            });
        }

        const analytics = await Product.sequelize.query(`
            WITH sales_metrics AS (
                SELECT 
                    COUNT(DISTINCT o.id) as "totalOrders",
                    SUM(o.quantity) as "totalItemsSold",
                    SUM(o.amount) as "totalRevenue",
                    COUNT(DISTINCT o."userId") as "uniqueCustomers",
                    AVG(o.amount) as "averageOrderValue"
                FROM orders o
                WHERE o.status = 'success'
            ),
            product_metrics AS (
                SELECT 
                    COUNT(DISTINCT p.id) as "totalProducts",
                    SUM(p."totalStock") as "totalInventory",
                    COUNT(DISTINCT CASE WHEN p."totalStock" <= 5 THEN p.id END) as "lowStockProducts",
                    COUNT(DISTINCT CASE WHEN p.status = true THEN p.id END) as "activeProducts"
                FROM products p
            ),
            category_metrics AS (
                SELECT 
                    COUNT(DISTINCT c.id) as "totalCategories",
                    COUNT(DISTINCT CASE WHEN c.status = true THEN c.id END) as "activeCategories"
                FROM categories c
            ),
            recent_sales AS (
                SELECT 
                    o.id,
                    o."productName",
                    o.quantity,
                    o.amount,
                    o."customerName",
                    o.status,
                    o."createdAt"
                FROM orders o
                WHERE o.status = 'success'
                ORDER BY o."createdAt" DESC
                LIMIT 5
            ),
            top_products AS (
                SELECT 
                    p.id,
                    p.name,
                    p.price,
                    p."totalStock",
                    COALESCE(SUM(o.quantity), 0) as "totalSold",
                    COALESCE(SUM(o.amount), 0) as "totalRevenue"
                FROM products p
                LEFT JOIN orders o ON o."productId" = p.id::text AND o.status = 'success'
                GROUP BY p.id
                ORDER BY "totalSold" DESC
                LIMIT 5
            ),
            stock_alerts AS (
                SELECT 
                    p.id,
                    p.name,
                    p."totalStock",
                    c.name as "categoryName"
                FROM products p
                JOIN categories c ON p."categoryId" = c.id::text::uuid
                WHERE p."totalStock" <= 5 AND p.status = true
                ORDER BY p."totalStock" ASC
                LIMIT 5
            ),
            daily_sales AS (
                SELECT 
                    DATE(o."createdAt") as "date",
                    COUNT(DISTINCT o.id) as "orderCount",
                    SUM(o.quantity) as "itemsSold",
                    SUM(o.amount) as "revenue"
                FROM orders o
                WHERE o.status = 'success'
                AND o."createdAt" >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(o."createdAt")
                ORDER BY "date" DESC
            )
            SELECT 
                (SELECT json_build_object(
                    'totalOrders', "totalOrders",
                    'totalItemsSold', "totalItemsSold",
                    'totalRevenue', "totalRevenue",
                    'uniqueCustomers', "uniqueCustomers",
                    'averageOrderValue', "averageOrderValue"
                ) FROM sales_metrics) as "salesMetrics",
                
                (SELECT json_build_object(
                    'totalProducts', "totalProducts",
                    'totalInventory', "totalInventory",
                    'lowStockProducts', "lowStockProducts",
                    'activeProducts', "activeProducts"
                ) FROM product_metrics) as "productMetrics",
                
                (SELECT json_build_object(
                    'totalCategories', "totalCategories",
                    'activeCategories', "activeCategories"
                ) FROM category_metrics) as "categoryMetrics",
                
                (SELECT json_agg(row_to_json(rs)) FROM recent_sales rs) as "recentSales",
                
                (SELECT json_agg(row_to_json(tp)) FROM top_products tp) as "topProducts",
                
                (SELECT json_agg(row_to_json(sa)) FROM stock_alerts sa) as "stockAlerts",
                
                (SELECT json_agg(row_to_json(ds)) FROM daily_sales ds) as "dailySales"
        `, {
            type: QueryTypes.SELECT
        });

        res.json({
            status: true,
            message: "Dashboard analytics retrieved successfully",
            data: analytics[0]
        });

    } catch (error) {
        console.error("Dashboard analytics error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get Monthly Sales Analytics
product.get("/analytics/monthly", authenticated, async (req, res) => {
    try {
        if (req.user.roleId !== 1) {
            return res.status(403).json({
                status: false,
                message: "Access denied. Admin only."
            });
        }

        const { startDate, endDate } = req.query;
        let dateFilter = '';
        let replacements = {};

        if (startDate && endDate) {
            dateFilter = 'AND o."createdAt" BETWEEN :startDate AND :endDate';
            replacements = { startDate, endDate };
        }

        const query = `
            WITH monthly_sales AS (
                SELECT 
                    DATE_TRUNC('month', o."createdAt") as "month",
                    COUNT(DISTINCT o.id) as "orderCount",
                    SUM(o.quantity) as "itemsSold",
                    SUM(o.amount) as "revenue",
                    COUNT(DISTINCT o."userId") as "uniqueCustomers",
                    AVG(o.amount) as "averageOrderValue"
                FROM orders o
                WHERE o.status = 'success'
                ${dateFilter}
                GROUP BY DATE_TRUNC('month', o."createdAt")
                ORDER BY "month" ASC
            ),
            monthly_product_sales AS (
                SELECT 
                    DATE_TRUNC('month', o."createdAt") as "month",
                    p.name as "productName",
                    p.id as "productId",
                    SUM(o.quantity) as "quantitySold",
                    SUM(o.amount) as "revenue",
                    COUNT(DISTINCT o.id) as "orderCount"
                FROM orders o
                JOIN products p ON o."productId" = p.id::text
                WHERE o.status = 'success'
                ${dateFilter}
                GROUP BY DATE_TRUNC('month', o."createdAt"), p.name, p.id
                ORDER BY "month" ASC, "revenue" DESC
            ),
            monthly_category_sales AS (
                SELECT 
                    DATE_TRUNC('month', o."createdAt") as "month",
                    c.name as "categoryName",
                    c.id as "categoryId",
                    COUNT(DISTINCT o.id) as "orderCount",
                    SUM(o.quantity) as "itemsSold",
                    SUM(o.amount) as "revenue"
                FROM orders o
                JOIN products p ON o."productId" = p.id::text
                JOIN categories c ON p."categoryId" = c.id::text::uuid
                WHERE o.status = 'success'
                ${dateFilter}
                GROUP BY DATE_TRUNC('month', o."createdAt"), c.name, c.id
                ORDER BY "month" ASC, "revenue" DESC
            ),
            monthly_summary AS (
                SELECT 
                    COUNT(DISTINCT "month") as "totalMonths",
                    SUM("orderCount") as "totalOrders",
                    SUM("itemsSold") as "totalItemsSold",
                    SUM("revenue") as "totalRevenue",
                    AVG("averageOrderValue") as "overallAverageOrderValue"
                FROM monthly_sales
            )
            SELECT 
                (SELECT json_build_object(
                    'totalMonths', "totalMonths",
                    'totalOrders', "totalOrders",
                    'totalItemsSold', "totalItemsSold",
                    'totalRevenue', "totalRevenue",
                    'overallAverageOrderValue', "overallAverageOrderValue"
                ) FROM monthly_summary) as "summary",
                (SELECT json_agg(row_to_json(ms)) FROM monthly_sales ms) as "monthlyStats",
                (SELECT json_agg(row_to_json(mps)) FROM monthly_product_sales mps) as "monthlyProductStats",
                (SELECT json_agg(row_to_json(mcs)) FROM monthly_category_sales mcs) as "monthlyCategoryStats"
        `;

        const analytics = await Product.sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({
            status: true,
            message: "Monthly sales analytics retrieved successfully",
            data: analytics[0]
        });

    } catch (error) {
        console.error("Monthly analytics error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get Weekly Sales Analytics
product.get("/analytics/weekly", authenticated, async (req, res) => {
    try {
        if (req.user.roleId !== 1) {
            return res.status(403).json({
                status: false,
                message: "Access denied. Admin only."
            });
        }

        const query = `
            WITH weekly_sales AS (
                SELECT 
                    DATE_TRUNC('week', o."createdAt") as "week",
                    COUNT(DISTINCT o.id) as "orderCount",
                    SUM(o.quantity) as "itemsSold",
                    SUM(o.amount) as "revenue",
                    COUNT(DISTINCT o."userId") as "uniqueCustomers"
                FROM orders o
                WHERE o.status = 'success'
                AND o."createdAt" >= CURRENT_DATE - INTERVAL '12 weeks'
                GROUP BY DATE_TRUNC('week', o."createdAt")
                ORDER BY "week" ASC
            ),
            weekly_product_sales AS (
                SELECT 
                    DATE_TRUNC('week', o."createdAt") as "week",
                    p.name as "productName",
                    SUM(o.quantity) as "quantitySold",
                    SUM(o.amount) as "revenue"
                FROM orders o
                JOIN products p ON o."productId" = p.id::text
                WHERE o.status = 'success'
                AND o."createdAt" >= CURRENT_DATE - INTERVAL '12 weeks'
                GROUP BY DATE_TRUNC('week', o."createdAt"), p.name
                ORDER BY "week" ASC, "revenue" DESC
            )
            SELECT 
                (SELECT json_agg(row_to_json(ws)) FROM weekly_sales ws) as "weeklyStats",
                (SELECT json_agg(row_to_json(wps)) FROM weekly_product_sales wps) as "weeklyProductStats"
        `;

        const analytics = await Product.sequelize.query(query, {
            type: QueryTypes.SELECT
        });

        res.json({
            status: true,
            message: "Weekly sales analytics retrieved successfully",
            data: analytics[0]
        });

    } catch (error) {
        console.error("Weekly analytics error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get Yearly Sales Analytics
product.get("/analytics/yearly", authenticated, async (req, res) => {
    try {
        if (req.user.roleId !== 1) {
            return res.status(403).json({
                status: false,
                message: "Access denied. Admin only."
            });
        }

        const query = `
            WITH yearly_sales AS (
                SELECT 
                    DATE_TRUNC('year', o."createdAt") as "year",
                    COUNT(DISTINCT o.id) as "orderCount",
                    SUM(o.quantity) as "itemsSold",
                    SUM(o.amount) as "revenue",
                    COUNT(DISTINCT o."userId") as "uniqueCustomers"
                FROM orders o
                WHERE o.status = 'success'
                GROUP BY DATE_TRUNC('year', o."createdAt")
                ORDER BY "year" ASC
            ),
            yearly_product_sales AS (
                SELECT 
                    DATE_TRUNC('year', o."createdAt") as "year",
                    p.name as "productName",
                    SUM(o.quantity) as "quantitySold",
                    SUM(o.amount) as "revenue"
                FROM orders o
                JOIN products p ON o."productId" = p.id::text
                WHERE o.status = 'success'
                GROUP BY DATE_TRUNC('year', o."createdAt"), p.name
                ORDER BY "year" ASC, "revenue" DESC
            ),
            yearly_category_sales AS (
                SELECT 
                    DATE_TRUNC('year', o."createdAt") as "year",
                    c.name as "categoryName",
                    COUNT(DISTINCT o.id) as "orderCount",
                    SUM(o.quantity) as "itemsSold",
                    SUM(o.amount) as "revenue"
                FROM orders o
                JOIN products p ON o."productId" = p.id::text
                JOIN categories c ON p."categoryId" = c.id::text::uuid
                WHERE o.status = 'success'
                GROUP BY DATE_TRUNC('year', o."createdAt"), c.name
                ORDER BY "year" ASC, "revenue" DESC
            )
            SELECT 
                (SELECT json_agg(row_to_json(ys)) FROM yearly_sales ys) as "yearlyStats",
                (SELECT json_agg(row_to_json(yps)) FROM yearly_product_sales yps) as "yearlyProductStats",
                (SELECT json_agg(row_to_json(ycs)) FROM yearly_category_sales ycs) as "yearlyCategoryStats"
        `;

        const analytics = await Product.sequelize.query(query, {
            type: QueryTypes.SELECT
        });

        res.json({
            status: true,
            message: "Yearly sales analytics retrieved successfully",
            data: analytics[0]
        });

    } catch (error) {
        console.error("Yearly analytics error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

module.exports = product;
