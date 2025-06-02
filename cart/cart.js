const cart = require("express").Router();
const { authenticated } = require("../middleware/auth");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { QueryTypes } = require('sequelize');
const axios = require("axios");

// Add item to cart
cart.post("/add", authenticated, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.id;

        if (!productId || !quantity) {
            return res.status(400).json({ 
                status: false, 
                message: "Product ID and quantity are required" 
            });
        }

        // Check if product exists and has enough stock
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ 
                status: false, 
                message: "Product not found" 
            });
        }

        if (product.totalStock < quantity) {
            return res.status(400).json({ 
                status: false, 
                message: "Not enough stock available" 
            });
        }

        // Check if item already exists in cart
        const existingCartItem = await Cart.findOne({
            where: { userId, productId }
        });

        if (existingCartItem) {
            // Update quantity if item exists
            existingCartItem.quantity = quantity;
            await existingCartItem.save();
            return res.json({ 
                status: true, 
                message: "Cart updated successfully", 
                data: existingCartItem 
            });
        }

        // Create new cart item
        const cartItem = await Cart.create({
            userId,
            productId,
            quantity
        });

        res.json({ 
            status: true, 
            message: "Item added to cart successfully", 
            data: cartItem 
        });

    } catch (error) {
        res.status(500).json({ 
            status: false, 
            message: error.message 
        });
    }
});

// Get user's cart
cart.get("/", authenticated, async (req, res) => {
    try {
        const userId = req.user.id;

        const query = `
            SELECT 
                c.id as "cartId",
                c.quantity,
                c."createdAt",
                c."updatedAt",
                p.id as "productId",
                p.name as "productName",
                p.price,
                p.description,
                p."totalStock",
                p.status,
                ARRAY_AGG(i."imageUrl") as images
            FROM carts c
            JOIN products p ON c."productId" = p.id
            LEFT JOIN images i ON i."productId" = p.id::text
            WHERE c."userId" = :userId
            GROUP BY c.id, p.id, c.quantity, c."createdAt", c."updatedAt"
            ORDER BY c."createdAt" DESC;
        `;

        const cartItems = await Cart.sequelize.query(query, {
            replacements: { userId },
            type: QueryTypes.SELECT
        });

        // Calculate total
        const total = cartItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        res.json({
            status: true,
            data: {
                items: cartItems,
                total: total
            }
        });

    } catch (error) {
        console.error("Cart fetch error:", error);
        res.status(500).json({ 
            status: false, 
            message: error.message 
        });
    }
});

// Remove item from cart
cart.delete("/:cartId", authenticated, async (req, res) => {
    try {
        const { cartId } = req.params;
        const userId = req.user.id;

        const cartItem = await Cart.findOne({
            where: { id: cartId, userId }
        });

        if (!cartItem) {
            return res.status(404).json({ 
                status: false, 
                message: "Cart item not found" 
            });
        }

        await cartItem.destroy();

        res.json({ 
            status: true, 
            message: "Item removed from cart successfully" 
        });

    } catch (error) {
        res.status(500).json({ 
            status: false, 
            message: error.message 
        });
    }
});

// Update cart item quantity
cart.put("/:cartId", authenticated, async (req, res) => {
    try {
        const { cartId } = req.params;
        const { quantity } = req.body;
        const userId = req.user.id;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ 
                status: false, 
                message: "Valid quantity is required" 
            });
        }

        const cartItem = await Cart.findOne({
            where: { id: cartId, userId },
            include: [{
                model: Product,
                attributes: ['totalStock']
            }]
        });

        if (!cartItem) {
            return res.status(404).json({ 
                status: false, 
                message: "Cart item not found" 
            });
        }

        // Check if requested quantity is available in stock
        if (cartItem.Product.totalStock < quantity) {
            return res.status(400).json({ 
                status: false, 
                message: "Not enough stock available" 
            });
        }

        cartItem.quantity = quantity;
        await cartItem.save();

        res.json({ 
            status: true, 
            message: "Cart updated successfully", 
            data: cartItem 
        });

    } catch (error) {
        res.status(500).json({ 
            status: false, 
            message: error.message 
        });
    }
});

// Checkout cart with Paystack
cart.post("/checkout", authenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const { email, address, city, state, country } = req.body;

        if (!email || !address || !city || !state || !country) {
            return res.status(400).json({
                status: false,
                message: "Email and delivery details are required"
            });
        }

        // Get cart items with product details
        const query = `
            SELECT 
                c.id as "cartId",
                c.quantity,
                p.id as "productId",
                p.name as "productName",
                p.price,
                p."totalStock"
            FROM carts c
            JOIN products p ON c."productId" = p.id
            WHERE c."userId" = :userId;
        `;

        const cartItems = await Cart.sequelize.query(query, {
            replacements: { userId },
            type: QueryTypes.SELECT
        });

        if (!cartItems.length) {
            return res.status(400).json({
                status: false,
                message: "Cart is empty"
            });
        }

        // Check stock availability
        for (const item of cartItems) {
            if (item.totalStock < item.quantity) {
                return res.status(400).json({
                    status: false,
                    message: `Not enough stock for ${item.productName}`
                });
            }
        }

        // Calculate total amount
        const totalAmount = cartItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // Prepare product descriptions for metadata
        const productDescriptions = cartItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            product_total: item.price * item.quantity,
            customer_name: req.user.name,
            address,
            city,
            state,
            country
        }));

        // Initialize Paystack payment
        const response = await axios.post(
            `${process.env.paystackUrl}/transaction/initialize`,
            {
                email,
                amount: totalAmount * 100, // Convert to kobo
                callback_url: `${process.env.FRONTEND_URL}/payment/verify`,
                metadata: {
                    userId,
                    products: {
                        productDescriptions,
                        deliveryDetails: {
                            address,
                            city,
                            state,
                            country
                        }
                    }
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.paystackSecretKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        res.json({
            status: true,
            message: 'Payment initialized successfully',
            data: response.data.data
        });

    } catch (error) {
        console.error("Checkout error:", error);
        res.status(500).json({
            status: false,
            message: error.response?.data?.message || error.message
        });
    }
});

// Verify payment and process order
cart.post("/verify-payment", authenticated, async (req, res) => {
    try {
        const { reference } = req.body;
        const userId = req.user.id;

        // Verify payment with Paystack
        const response = await axios.get(
            `${process.env.paystackUrl}/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.paystackSecretKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data.data.status !== 'success') {
            return res.status(400).json({
                status: false,
                message: 'Payment verification failed'
            });
        }

        // Get cart items
        const query = `
            SELECT 
                c.id as "cartId",
                c.quantity,
                p.id as "productId",
                p.name as "productName",
                p.price,
                p."totalStock"
            FROM carts c
            JOIN products p ON c."productId" = p.id
            WHERE c."userId" = :userId;
        `;

        const cartItems = await Cart.sequelize.query(query, {
            replacements: { userId },
            type: QueryTypes.SELECT
        });

        // Create orders and update stock
        for (const item of cartItems) {
            // Create order
            await Order.create({
                reference,
                productId: item.productId,
                productName: item.productName,
                customerName: req.user.name,
                amount: item.price * item.quantity,
                userId,
                quantity: item.quantity,
                status: 'success'
            });

            // Update product stock
            await Product.update(
                { totalStock: item.totalStock - item.quantity },
                { where: { id: item.productId } }
            );

            // Remove item from cart
            await Cart.destroy({
                where: { id: item.cartId }
            });
        }

        // Create delivery record
        await Delivery.create({
            orderId: reference,
            status: 'pending',
            address: response.data.data.metadata.products.deliveryDetails.address,
            city: response.data.data.metadata.products.deliveryDetails.city,
            state: response.data.data.metadata.products.deliveryDetails.state,
            country: response.data.data.metadata.products.deliveryDetails.country
        });

        res.json({
            status: true,
            message: 'Payment verified and order processed successfully'
        });

    } catch (error) {
        console.error("Payment verification error:", error);
        res.status(500).json({
            status: false,
            message: error.response?.data?.message || error.message
        });
    }
});

module.exports = cart; 