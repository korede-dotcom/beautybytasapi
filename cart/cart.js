const cart = require("express").Router();
const { authenticated } = require("../middleware/auth");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { QueryTypes } = require('sequelize');

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

module.exports = cart; 