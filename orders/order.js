const connectDB = require("../config/connectDB");
const { authenticated } = require("../middleware/auth");
const Category = require("../models/Category");
const Customer = require("../models/Customer");
const User = require("../models/User");
const {validateCustomer} = require("./validations/validator");
const router = require("express").Router()
const bcrypt = require("bcryptjs");
const { QueryTypes } = require('sequelize');
const axios = require("axios");
const Product = require("../models/Product");
const sequelize = require('sequelize');
const Order = require("../models/Order");
const Delivery = require("../models/Delivery");
const asyncHandler = require('express-async-handler');
// const Cart = require("../models/Cart");
// const {Cart} = require("../models/Cart");
const Image = require("../models/Images");
router.get("/insights", async (req, res) => {
  try {
    const dashboard = await Order.sequelize.query(`
        WITH product_data AS (
            SELECT 
                jsonb_array_elements(products::jsonb) AS product,
                "userId" AS user_id,
                "created_at" AS created_at,
                status
            FROM 
                orders
        ),
        product_details AS (
            SELECT
                p.id AS product_id,
                p.name,
                p.description,
                p.price,
                (product->>'quantity')::int AS quantity,
                p.price * ((product->>'quantity')::int) AS product_total,
                p.price * ((product->>'quantity')::int) AS total_price
            FROM 
                product_data pd
            JOIN 
                products p ON p.id = (pd.product->>'product_id')::uuid
        ),
        sales_by_date AS (
            SELECT 
                DATE(created_at) AS date,
                SUM(total_price) AS total_sales
            FROM 
                product_data
            JOIN 
                product_details pd ON pd.product_id = (product->>'product_id')::uuid
            GROUP BY 
                DATE(created_at)
        ),
        sales_by_product AS (
            SELECT 
                pd.product_id,
                pd.name AS product_name,
                SUM(pd.total_price) AS total_sales,
                SUM(pd.quantity) AS total_quantity
            FROM 
                product_details pd
            GROUP BY 
                pd.product_id, pd.name
        ),
        sales_by_user AS (
            SELECT 
                pd.user_id,
                u.name AS user_name,
                SUM(pd.total_price) AS total_sales
            FROM 
                product_data pd
            JOIN 
                users u ON pd.user_id = u.id
            GROUP BY 
                pd.user_id, u.name
        ),
        sales_by_category AS (
            SELECT 
                c.name AS category_name,
                SUM(pd.total_price) AS total_sales
            FROM 
                product_details pd
            JOIN 
                products p ON pd.product_id = p.id
            JOIN 
                categories c ON p.categoryId = c.id
            GROUP BY 
                c.name
        ),
        order_summary AS (
            SELECT 
                COUNT(*) AS total_orders,
                SUM(pd.total_price) AS total_revenue
            FROM 
                product_data pd
            JOIN 
                product_details pd2 ON (pd.product->>'product_id')::uuid = pd2.product_id
            WHERE 
                pd.status = 'success'
        ),
        status_distribution AS (
            SELECT 
                status,
                COUNT(*) AS count
            FROM 
                orders
            GROUP BY 
                status
        )
        SELECT 
            'sales_by_date' AS type, 
            date AS category, 
            total_sales
        FROM 
            sales_by_date
        UNION ALL
        SELECT 
            'sales_by_product' AS type, 
            product_name AS category, 
            total_sales
        FROM 
            sales_by_product
        UNION ALL
        SELECT 
            'sales_by_user' AS type, 
            user_name AS category, 
            total_sales
        FROM 
            sales_by_user
        UNION ALL
        SELECT 
            'sales_by_category' AS type, 
            category_name AS category, 
            total_sales
        FROM 
            sales_by_category
        UNION ALL
        SELECT 
            'order_summary' AS type, 
            'Total Orders' AS category, 
            total_orders
        FROM 
            order_summary
        UNION ALL
        SELECT 
            'order_summary' AS type, 
            'Total Revenue' AS category, 
            total_revenue
        FROM 
            order_summary
        UNION ALL
        SELECT 
            'status_distribution' AS type, 
            status AS category, 
            count
        FROM 
            status_distribution;
    `, {
        type: sequelize.QueryTypes.SELECT
    });
    
    console.log("🚀 ~ Dashboard Data:", dashboard);
    return res.json({ data: dashboard, status: true });

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return res.status(500).json({ data: error.message, status: false });
  }
});




// router.get("/cart", asyncHandler(async function (req, res) {

  
//   res.status(200).json({ data: getAll, status: true });

// })

// )
// router.post("/cart", asyncHandler(async function (req, res) {
//    const saveCart = await Carts.create(req.body)
//    res.status(202).json({ data: saveCart, status: true, message: 'success'});

// }))


router.post('/paystack/initialize', async (req, res) => {
  const { email, orders,name,address,city,state,country } = req.body;

  const productArray = JSON.stringify(orders);
  console.log("🚀 ~ router.post ~ productArray:", productArray)

  const query = `
  WITH product_data AS (
      SELECT 
          jsonb_array_elements(:productArray::jsonb) AS product
  ),
  product_details AS (
      SELECT
          p."id" AS product_id,
          p.name,
          p.description,  -- Add description here
          p.price,
          (pd.product->>'quantity')::int AS quantity,
          p.price * ((pd.product->>'quantity')::int) AS product_total
      FROM 
          products p
      JOIN 
          product_data pd 
      ON 
          p."id" = (pd.product->>'productId')::uuid
  )
  SELECT 
      pd.*,
      (SELECT SUM(product_total) FROM product_details) AS total_price
  FROM 
      product_details pd;
  `;

const totals = await Product.sequelize.query(query, {
    type: sequelize.QueryTypes.SELECT,
    replacements: { productArray }
  });

  console.log("🚀 ~ Debug ~ totals:", totals);

  const productDescriptions = totals.map(d => {
    return {...d,customer_name:name,address:address,city:city,state:state,country:country}
  })
  console.log("🚀 ~ productDescriptions ~ productDescriptions:", productDescriptions)

  try {
    const response = await axios.post(
      `${process.env.paystackUrl}/transaction/initialize`,
      {
        email,
        amount: productDescriptions[0].total_price * 100, // Convert to koboc
        callback_url: "http://localhost:3200/paystack/webhook",
        metadata: {
          // products: JSON.stringify(totals),
          products: {
            productDescriptions:productDescriptions,
            deliveryDetails:{
              address: address,
              city: city,
              state: state,
              country: country,
            }
          },
          
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({
      status: true,
      message: 'Payment initialized successfully',
      data: response.data.data,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Payment initialization failed',
      error: error.response ? error.response.data : error.message,
    });
  }
});



router.get('/paystack/verify/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const response = await axios.get(
      `${process.env.paystackUrl}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({
      status: true,
      message: 'Payment verification successful',
      data: response.data.data,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: 'Payment verification failed',
      error: error.response ? error.response.data : error.message,
    });
  }
});



router.post('/paystack/webhook', async (req, res) => {
  const paystackSignature = req.headers['x-paystack-signature'];
  const secret = process.env.paystackSecretKey;

  // Verify webhook signature
  if (!paystackSignature) {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  // Validate the signature
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== paystackSignature) {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  // Handle the event
  const event = req.body;
  console.log('Event received:', event);

  const response = await axios.get(
    `${process.env.paystackUrl}/transaction/verify/${event.data.reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
  console.log("🚀 ~ response:", response)

  const mappedProduct = event.data.metadata.products.productDescriptions.forEach(async (element) => {
    await Order.create({
      reference: event.data.reference,
      status: response.data.data.status,
      amount: element.product_total,
      quantity: element.quantity,
      productName: element.name,
      customerName: element.customer_name,
      userId: event.data.metadata.userId || "21136955-6f72-474f-bd57-f7fb3b753173",
      productId: element.product_id
    });
  });

  await Delivery.create({
    orderId: response.data.data.id,
    status: "pending",
    ...event.data.metadata.products.deliveryDetails
  });

  res.status(200).json({ message: 'Webhook received' });
});



router.get("/", authenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        // Get paginated orders with user and product details
        const query = `
            SELECT 
                o.id,
                o.reference,
                o."productId" as "productId",
                o."productName" as "productName",
                o."customerName" as "customerName",
                o.amount,
                o."userId" as "userId",
                o.quantity,
                o.status,
                o."createdAt" as "createdAt",
                u.email as "userEmail",
                d.address,
                d.city,
                d.state,
                d.country,
                d.status as "deliveryStatus"
            FROM orders o
            LEFT JOIN users u ON o."userId" = u.id::text
            LEFT JOIN deliveries d ON o.reference = d."orderId"
            ORDER BY o."createdAt" DESC
            LIMIT :limit OFFSET :offset;
        `;

        // Get total count of orders
        const countQuery = `
            SELECT COUNT(*) as total
            FROM orders;
        `;

        const orders = await Order.sequelize.query(query, {
            replacements: { limit, offset },
            type: QueryTypes.SELECT
        });

        const [{ total }] = await Order.sequelize.query(countQuery, {
            type: QueryTypes.SELECT
        });

        const totalPages = Math.ceil(total / limit);

        res.json({
            status: true,
            message: "Orders retrieved successfully",
            data: {
                orders,
                pagination: {
                    totalItems: total,
                    totalPages,
                    currentPage: page,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error("Orders fetch error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get user's orders
router.get("/my-orders", authenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        // Get paginated orders for specific user
        const query = `
            SELECT 
                o.id,
                o.reference,
                o."productId" as "productId",
                o."productName" as "productName",
                o."customerName" as "customerName",
                o.amount,
                o.quantity,
                o.status,
                o."createdAt" as "createdAt",
                d.address,
                d.city,
                d.state,
                d.country,
                d.status as "deliveryStatus"
            FROM orders o
            LEFT JOIN deliveries d ON o.reference = d."orderId"
            WHERE o."userId" = :userId
            ORDER BY o."createdAt" DESC
            LIMIT :limit OFFSET :offset;
        `;

        // Get total count of user's orders
        const countQuery = `
            SELECT COUNT(*) as total
            FROM orders
            WHERE "userId" = :userId;
        `;

        const orders = await Order.sequelize.query(query, {
            replacements: { userId, limit, offset },
            type: QueryTypes.SELECT
        });

        const [{ total }] = await Order.sequelize.query(countQuery, {
            replacements: { userId },
            type: QueryTypes.SELECT
        });

        const totalPages = Math.ceil(total / limit);

        res.json({
            status: true,
            message: "User orders retrieved successfully",
            data: {
                orders,
                pagination: {
                    totalItems: total,
                    totalPages,
                    currentPage: page,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error("User orders fetch error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get order details
router.get("/details/:orderId", authenticated, async (req, res) => {
    try {
        const { orderId } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        // Get order details with pagination
        const query = `
            SELECT 
                o.id,
                o.reference,
                o."productId" as "productId",
                o."productName" as "productName",
                o."customerName" as "customerName",
                o.amount,
                o.quantity,
                o.status,
                o."createdAt" as "createdAt",
                u.email as "userEmail",
                d.address,
                d.city,
                d.state,
                d.country,
                d.status as "deliveryStatus",
                p.description,
                p."totalStock" as "totalStock",
                ARRAY_AGG(i."imageUrl") as images
            FROM orders o
            LEFT JOIN users u ON o."userId" = u.id::text
            LEFT JOIN deliveries d ON o.reference = d."orderId"
            LEFT JOIN products p ON o."productId" = p.id::text
            LEFT JOIN images i ON p.id = i."productId"
            WHERE o.id = :orderId
            GROUP BY o.id, u.email, d.address, d.city, d.state, d.country, d.status, p.description, p."totalStock"
            LIMIT :limit OFFSET :offset;
        `;

        const orderDetails = await Order.sequelize.query(query, {
            replacements: { orderId, limit, offset },
            type: QueryTypes.SELECT
        });

        if (!orderDetails.length) {
            return res.status(404).json({
                status: false,
                message: "Order not found"
            });
        }

        res.json({
            status: true,
            message: "Order details retrieved successfully",
            data: orderDetails[0]
        });

    } catch (error) {
        console.error("Order details fetch error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Get order details from Paystack reference
router.get("/verify/:reference", async (req, res) => {
    try {
        const { reference } = req.params;

        // Verify payment with Paystack
        const paystackResponse = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );

        const { status, data: paymentData } = paystackResponse.data;

        if (status !== 'success') {
            return res.status(400).json({
                status: false,
                message: "Payment verification failed"
            });
        }

        // Get order details
        const query = `
            SELECT 
                o.id,
                o.reference,
                o."productId" as "productId",
                p.name as "productName",
                c.name as "customerName",
                c.email as "userEmail",
                o.amount,
                o."deliveryStatus",
                o."createdAt",
                o."updatedAt",
                p."totalStock" as "totalStock",
                ARRAY_AGG(i."imageUrl") as images
            FROM orders o
            JOIN products p ON o."productId" = p.id
            JOIN customers c ON o."customerId" = c.id
            LEFT JOIN images i ON i."productId" = p.id::text
            WHERE o.reference = :reference
            GROUP BY o.id, p.id, c.id
        `;

        const [order] = await Order.sequelize.query(query, {
            replacements: { reference },
            type: QueryTypes.SELECT
        });

        if (!order) {
            return res.status(404).json({
                status: false,
                message: "Order not found"
            });
        }

        res.json({
            status: true,
            message: "Order details retrieved successfully",
            data: {
                ...order,
                paymentDetails: {
                    reference: paymentData.reference,
                    status: paymentData.status,
                    paidAt: paymentData.paid_at,
                    channel: paymentData.channel,
                    amount: paymentData.amount / 100 // Convert from kobo to naira
                }
            }
        });

    } catch (error) {
        console.error("Order verification error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});



  router.post("/", validateCustomer, async (req, res) => {
    const transaction = await connectDB.transaction();
    
    try {
      const { name, email, address, phonenumber, password } = req.body;
  
      // Check if the email already exists
      const checkEmail = await User.findOne({ where: { email }, transaction });
      if (checkEmail) {
        await transaction.rollback();
        return res.status(400).json({ status: false, message: "Email already exists" });
      }
  
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new user
      const user = await User.create({ name, email, password: hashedPassword, roleId:2 }, { transaction });
  
      // Create the customer associated with the user
      const customer = await Customer.create({ userId: user.id, phonenumber, address }, { transaction });
  
      // Commit the transaction
      await transaction.commit();
      
      return res.status(201).json({ status: true, message: "Customer created", customer, user });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ status: false, message: error.message });
    }
  });
  



module.exports = router;