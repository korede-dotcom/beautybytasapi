const product = require("express").Router();
const {authenticated} = require("../middleware/auth");
const multer = require("multer")
const upload = require("../utils/multer");
const cloudinary = require("cloudinary").v2;
const { Product, Images } = require("../models/associations");
const User = require("../models/User");
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
                p.id AS "productId",
                p.name AS "productName",
                p."categoryId",
                p.price,
                p.status,
                p."totalStock",
                p.description,
                p.benefits,
                p.howtouse,
                p.ingredients,
                p."createdAt",
                c.name AS "categoryName",
                ARRAY_AGG(i."imageUrl") AS images
            FROM products p 
            JOIN categories c ON p."categoryId" = c.id::text::uuid
            LEFT JOIN images i ON i."productId" = p.id::uuid::text
            GROUP BY p.id, c.name
            ORDER BY p."createdAt" DESC
            LIMIT ? OFFSET ?;
        `;

        const [results] = await Product.sequelize.query(query, {
            replacements: [limit, offset],
        });

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
                p.id AS "productId",
                p.name AS "productName",
                p."categoryId",
                p.price,
                p.status,
                p."totalStock",
                p.description,
                p.benefits,
                p.howtouse,
                p.ingredients,
                p."createdAt",
                c.name AS "categoryName",
                ARRAY_AGG(i."imageUrl") AS images
            FROM products p
            JOIN categories c ON p."categoryId" = c.id::uuid
            LEFT JOIN images i ON i."productId" = p.id::text
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
                p.id AS "productId",
                p.name AS "productName",
                p."categoryId",
                p.price,
                p.status,
                p."totalStock",
                p.description,
                p.benefits,
                p.howtouse,
                p.ingredients,
                p."createdAt",
                c.name AS "categoryName",
                ARRAY_AGG(i."imageUrl") AS images
            FROM products p
            JOIN categories c ON p."categoryId" = c.id::uuid
            LEFT JOIN images i ON i."productId" = p.id::text
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
    try {
        const { id } = req.user;
        const { 
            productName,
            price, 
            description, 
            categoryId, 
            images, 
            totalStock, 
            benefits, 
            ingredients, 
            howtouse 
        } = req.body;

        console.log("🚀 ~ product.post ~ req.body:", req.body);

        // Validate required fields
        if (!productName || !price || !description || !categoryId || !totalStock) {
            return res.status(400).json({
                status: false,
                message: "Please enter all required fields (productName, price, description, categoryId, totalStock)"
            });
        }

        // Validate images array
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({
                status: false,
                message: "Please provide at least one image"
            });
        }

        // Create the product using raw query
        const createProductQuery = `
            INSERT INTO products (
                id, name, price, description, "categoryId", "totalStock", 
                "userId", benefits, ingredients, howtouse, status,
                "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid(), :name, :price, :description, :categoryId::uuid, 
                :totalStock, :userId::uuid, :benefits, :ingredients, :howtouse, true,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            ) RETURNING id;
        `;

        const [result] = await Product.sequelize.query(createProductQuery, {
            replacements: {
                name: productName,
                price: parseFloat(price),
                description,
                categoryId,
                totalStock: parseInt(totalStock),
                userId: id,
                benefits: benefits || null,
                ingredients: ingredients || null,
                howtouse: howtouse || "Apply this product"
            },
            type: QueryTypes.INSERT
        });

        const productId = result[0].id;

        // Create image records using raw query
        const createImageQuery = `
            INSERT INTO images (id, "productId", "imageUrl", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), :productId::uuid, :imageUrl, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id;
        `;

        const imagePromises = images.map(imageUrl => 
            Product.sequelize.query(createImageQuery, {
                replacements: {
                    productId,
                    imageUrl
                },
                type: QueryTypes.INSERT
            })
        );

        await Promise.all(imagePromises);

        // Fetch the created product with images using raw query
        const fetchProductQuery = `
            SELECT 
                p.*,
                COALESCE(ARRAY_AGG(i."imageUrl") FILTER (WHERE i."imageUrl" IS NOT NULL), ARRAY[]::varchar[]) as images
            FROM products p
            LEFT JOIN images i ON i."productId"::uuid = p.id
            WHERE p.id = :productId::uuid
            GROUP BY p.id;
        `;

        const [createdProduct] = await Product.sequelize.query(fetchProductQuery, {
            replacements: { productId },
            type: QueryTypes.SELECT
        });

        res.json({ 
            status: true,
            message: 'Product created successfully', 
            data: createdProduct 
        });
    } catch (error) {
        console.error("Product creation error:", error);
        res.status(500).json({ 
            status: false,
            message: error.message 
        });
    }
});

// update a product by admin only
product.put("/update/:id", authenticated, upload.single("image"), async (req, res) => {
    try {
        const { id } = req.user; // Get user ID and role from JWT token

        const user = await User.findOne({where:{id:id}});
        const roleId = user.roleId;
        console.log("🚀 ~ product.put ~ user:", user)
        // Check if user is admin (roleId 1 is admin)
        if (roleId !== 1) {
            return res.status(403).json({
                status: false,
                message: "Access denied. Admin only."
            });
        }

        const {
            name,
            price,
            description,
            categoryId,
            totalStock,
            benefits,
            howtouse,
            ingredients,
            status
        } = req.body;

        // Find the product
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({
                status: false,
                message: "Product not found"
            });
        }

        // Prepare update object with only provided fields
        const updateData = {};
        if (name) updateData.name = name;
        if (price) updateData.price = parseFloat(price);
        if (description) updateData.description = description;
        if (categoryId) updateData.categoryId = categoryId;
        if (totalStock) updateData.totalStock = parseInt(totalStock);
        if (benefits) updateData.benefits = benefits;
        if (howtouse) updateData.howtouse = howtouse;
        if (ingredients) updateData.ingredients = ingredients;
        if (status !== undefined) updateData.status = status;

        // Handle image upload if provided
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, { folder: "beautybytashop" });
            // Create new image record instead of updating product image
            await Images.create({
                productId: product.id,
                imageUrl: result.url
            });
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
        }

        // Update product
        await product.update(updateData);

        // Fetch updated product with all details using raw query to ensure proper type casting
        const query = `
            SELECT 
                p.*,
                COALESCE(ARRAY_AGG(i."imageUrl") FILTER (WHERE i."imageUrl" IS NOT NULL), ARRAY[]::varchar[]) as images
            FROM products p
            LEFT JOIN images i ON i."productId"::uuid = p.id
            WHERE p.id = :productId::uuid
            GROUP BY p.id;
        `;

        const [updatedProduct] = await Product.sequelize.query(query, {
            replacements: { productId: req.params.id },
            type: QueryTypes.SELECT
        });

        res.json({
            status: true,
            message: "Product updated successfully",
            data: updatedProduct
        });

    } catch (error) {
        // Clean up uploaded file if it exists
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        
        console.error("Product update error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// delete a product by admin only
product.get("/delete/:id",authenticated,async (req, res) => {
    const { id } = req.user; // Get user ID and role from JWT token

    const user = await User.findOne({where:{id:id}});
    const roleId = user.roleId;
    console.log("🚀 ~ product.put ~ user:", user)
    // Check if user is admin (roleId 1 is admin)
    if (roleId !== 1) {
        return res.status(403).json({
            status: false,
            message: "Access denied. Admin only."
        });
    }
    try {
        const product = await Product.findOne({where:{id:req.params.id}});
        await product.destroy();
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
                p.benefits,
                p.howtouse,
                p.ingredients,
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
                p.benefits,
                p.howtouse,
                p.ingredients,
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
        // if (req.user.roleId !== 1) {
        //     return res.status(403).json({
        //         status: false,
        //         message: "Access denied. Admin only."
        //     });
        // }

        const query = `
            WITH product_stats AS (
                SELECT 
                    COUNT(*) as total_products,
                    SUM("totalStock") as total_stock,
                    COUNT(CASE WHEN "totalStock" <= 5 THEN 1 END) as low_stock_count,
                    COUNT(CASE WHEN status = true THEN 1 END) as active_products,
                    AVG(price) as average_price
                FROM products
            ),
            category_stats AS (
                SELECT 
                    COUNT(*) as total_categories,
                    COUNT(CASE WHEN status = true THEN 1 END) as active_categories
                FROM categories
            ),
            sales_stats AS (
                SELECT 
                    COUNT(DISTINCT o.id) as total_orders,
                    SUM(o.quantity) as total_items_sold,
                    SUM(o.amount) as total_revenue,
                    COUNT(DISTINCT o."userId") as unique_customers,
                    AVG(o.amount) as average_order_value
                FROM orders o
                WHERE o.status = 'success'
            ),
            top_products AS (
                SELECT 
                    p.id,
                    p.name,
                    p.price,
                    p."totalStock" as stock,
                    SUM(o.quantity) as total_sold,
                    SUM(o.amount) as total_revenue
                FROM products p
                LEFT JOIN orders o ON o."productId" = p.id::text AND o.status = 'success'
                GROUP BY p.id, p.name, p.price, p."totalStock"
                ORDER BY total_sold DESC
                LIMIT 5
            ),
            low_stock_products AS (
                SELECT 
                    p.id,
                    p.name,
                    p."totalStock" as stock,
                    c.name as category_name
                FROM products p
                JOIN categories c ON p."categoryId" = c.id
                WHERE p."totalStock" <= 5
                ORDER BY p."totalStock" ASC
                LIMIT 5
            ),
            category_sales AS (
                SELECT 
                    c.id,
                    c.name,
                    COUNT(DISTINCT o.id) as order_count,
                    SUM(o.quantity) as items_sold,
                    SUM(o.amount) as revenue
                FROM categories c
                LEFT JOIN products p ON c.id = p."categoryId"
                LEFT JOIN orders o ON o."productId" = p.id::text AND o.status = 'success'
                GROUP BY c.id, c.name
                ORDER BY revenue DESC
            )
            SELECT 
                ps.*,
                cs.*,
                ss.*,
                (
                    SELECT json_agg(json_build_object(
                        'id', id,
                        'name', name,
                        'price', price,
                        'stock', stock,
                        'totalSold', total_sold,
                        'totalRevenue', total_revenue
                    ))
                    FROM top_products
                ) as top_products,
                (
                    SELECT json_agg(json_build_object(
                        'id', id,
                        'name', name,
                        'stock', stock,
                        'categoryName', category_name
                    ))
                    FROM low_stock_products
                ) as low_stock_products,
                (
                    SELECT json_agg(json_build_object(
                        'id', id,
                        'name', name,
                        'orderCount', order_count,
                        'itemsSold', items_sold,
                        'revenue', revenue
                    ))
                    FROM category_sales
                ) as category_sales
            FROM product_stats ps
            CROSS JOIN category_stats cs
            CROSS JOIN sales_stats ss;
        `;

        const [dashboard] = await Product.sequelize.query(query, {
            type: QueryTypes.SELECT
        });

        res.json({
            status: true,
            message: "Product dashboard data retrieved successfully",
            data: {
                productMetrics: {
                    totalProducts: parseInt(dashboard.total_products),
                    totalStock: parseInt(dashboard.total_stock),
                    lowStockCount: parseInt(dashboard.low_stock_count),
                    activeProducts: parseInt(dashboard.active_products),
                    averagePrice: parseFloat(dashboard.average_price)
                },
                categoryMetrics: {
                    totalCategories: parseInt(dashboard.total_categories),
                    activeCategories: parseInt(dashboard.active_categories)
                },
                salesMetrics: {
                    totalOrders: parseInt(dashboard.total_orders),
                    totalItemsSold: parseInt(dashboard.total_items_sold),
                    totalRevenue: parseFloat(dashboard.total_revenue),
                    uniqueCustomers: parseInt(dashboard.unique_customers),
                    averageOrderValue: parseFloat(dashboard.average_order_value)
                },
                topProducts: dashboard.top_products,
                lowStockProducts: dashboard.low_stock_products,
                categorySales: dashboard.category_sales
            }
        });

    } catch (error) {
        console.error("Product dashboard error:", error);
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

// Get Chart Data
product.get("/charts", authenticated, async (req, res) => {
    try {
        const query = `
            WITH monthly_sales AS (
                SELECT 
                    TO_CHAR(o."createdAt", 'Mon') as month,
                    DATE_TRUNC('month', o."createdAt") as month_date,
                    COUNT(DISTINCT o.id) as order_count,
                    SUM(o.amount) as revenue
                FROM orders o
                WHERE o.status = 'success'
                AND o."createdAt" >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY TO_CHAR(o."createdAt", 'Mon'), DATE_TRUNC('month', o."createdAt")
                ORDER BY month_date ASC
            ),
            weekly_product_sales AS (
                SELECT 
                    p.name as product_name,
                    DATE_TRUNC('week', o."createdAt") as week_date,
                    TO_CHAR(o."createdAt", 'WW') as week_number,
                    SUM(o.quantity) as quantity_sold
                FROM orders o
                JOIN products p ON o."productId" = p.id::text
                WHERE o.status = 'success'
                AND o."createdAt" >= CURRENT_DATE - INTERVAL '4 weeks'
                GROUP BY p.name, DATE_TRUNC('week', o."createdAt"), TO_CHAR(o."createdAt", 'WW')
                ORDER BY week_date ASC
            ),
            category_distribution AS (
                SELECT 
                    c.name as category_name,
                    SUM(o.amount) as total_revenue,
                    ROUND((SUM(o.amount) * 100.0 / SUM(SUM(o.amount)) OVER ()), 2) as percentage
                FROM orders o
                JOIN products p ON o."productId" = p.id::text
                JOIN categories c ON p."categoryId" = c.id
                WHERE o.status = 'success'
                GROUP BY c.name
                ORDER BY total_revenue DESC
            )
            SELECT 
                (
                    SELECT json_build_object(
                        'labels', array_agg(month),
                        'datasets', json_build_array(
                            json_build_object(
                                'label', 'Revenue',
                                'data', array_agg(revenue)
                            ),
                            json_build_object(
                                'label', 'Orders',
                                'data', array_agg(order_count)
                            )
                        )
                    )
                    FROM monthly_sales
                ) as monthly_sales,
                (
                    SELECT json_build_object(
                        'labels', array_agg(DISTINCT 'Week ' || week_number),
                        'datasets', (
                            SELECT json_agg(
                                json_build_object(
                                    'label', product_name,
                                    'data', array_agg(quantity_sold ORDER BY week_date)
                                )
                            )
                            FROM (
                                SELECT DISTINCT product_name
                                FROM weekly_product_sales
                                ORDER BY SUM(quantity_sold) DESC
                                LIMIT 3
                            ) top_products
                        )
                    )
                    FROM weekly_product_sales
                ) as product_performance,
                (
                    SELECT json_build_object(
                        'labels', array_agg(category_name),
                        'data', array_agg(percentage)
                    )
                    FROM category_distribution
                ) as category_distribution;
        `;

        const [chartData] = await Product.sequelize.query(query, {
            type: QueryTypes.SELECT
        });

        res.json({
            status: true,
            message: "Chart data retrieved successfully",
            data: {
                monthlySales: chartData.monthly_sales,
                productPerformance: chartData.product_performance,
                categoryDistribution: chartData.category_distribution
            }
        });

    } catch (error) {
        console.error("Chart data error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

module.exports = product;
