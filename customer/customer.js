const connectDB = require("../config/connectDB");
const { authenticated } = require("../middleware/auth");
const Category = require("../models/Category");
const Customer = require("../models/Customer");
const User = require("../models/User");
const {validateCustomer} = require("./validations/validator");
const router = require("express").Router()
const bcrypt = require("bcryptjs");
const { QueryTypes } = require('sequelize');
const { Op } = require('sequelize');

router.get("/", authenticated, async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        // Get total count of customers
        const countQuery = `
            SELECT COUNT(*) as total
            FROM customers;
        `;

        const [{ total }] = await Customer.sequelize.query(countQuery, {
            type: QueryTypes.SELECT
        });

        // Get paginated customers with user details
        const query = `
            SELECT 
                c.id as "customerId",
                c."userId",
                c.phonenumber as "phoneNumber",
                c.address,
                c."createdAt",
                u.name as "userName",
                u.email as "userEmail",
                COUNT(o.id) as "orderCount"
            FROM customers c
            INNER JOIN users u ON u.id = c."userId"::uuid
            LEFT JOIN orders o ON o."userId" = c."userId"::uuid
            GROUP BY c.id, c."userId", c.phonenumber, c.address, c."createdAt", u.name, u.email
            ORDER BY c."createdAt" DESC
            LIMIT :limit OFFSET :offset;
        `;

        const customers = await Customer.sequelize.query(query, {
            replacements: { limit, offset },
            type: QueryTypes.SELECT
        });

        const totalPages = Math.ceil(total / limit);

        res.json({
            status: true,
            message: "Customers retrieved successfully",
            data: {
                customers,
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
        console.error("Customers fetch error:", error);
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
  

// Get customer addresses
router.get("/addresses", authenticated, async (req, res) => {
    try {
        const userId = req.user.id;

        // First check if the table exists and has the required columns
        const tableCheckQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'customers' 
            AND column_name IN ('city', 'state', 'country', 'isDefaultAddress');
        `;

        const columns = await Customer.sequelize.query(tableCheckQuery, {
            type: QueryTypes.SELECT
        });

        if (columns.length < 4) {
            // If columns don't exist, force sync the model
            await Customer.sync({ force: true });
            return res.json({
                status: true,
                message: "Table structure updated. Please try again.",
                data: []
            });
        }

        const addresses = await Customer.findAll({
            where: { userId },
            attributes: ['id', 'address', 'city', 'state', 'country', 'isDefaultAddress', 'createdAt'],
            order: [
                ['isDefaultAddress', 'DESC'],
                ['createdAt', 'DESC']
            ]
        });

        res.json({
            status: true,
            message: addresses.length ? "Addresses retrieved successfully" : "No addresses found",
            data: addresses
        });

    } catch (error) {
        console.error("Get addresses error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Add customer address
router.post("/address", authenticated, async (req, res) => {
    try {
        const { address, city, state, country, isDefault } = req.body;
        const userId = req.user.id;

        if (!address || !city || !state || !country) {
            return res.status(400).json({
                status: false,
                message: "All address fields are required"
            });
        }

        // Check if the table has the required columns
        const tableCheckQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'customers' 
            AND column_name IN ('city', 'state', 'country', 'isDefaultAddress');
        `;

        const columns = await Customer.sequelize.query(tableCheckQuery, {
            type: QueryTypes.SELECT
        });

        if (columns.length < 4) {
            // If columns don't exist, force sync the model
            await Customer.sync({ force: true });
            return res.status(400).json({
                status: false,
                message: "Table structure updated. Please try again."
            });
        }

        // Check if this is the first address
        const addressCount = await Customer.count({
            where: { userId }
        });

        const isFirstAddress = addressCount === 0;
        const shouldBeDefault = isDefault || isFirstAddress;

        // If this is being set as default, unset any existing default
        if (shouldBeDefault) {
            await Customer.update(
                { isDefaultAddress: false },
                { where: { userId } }
            );
        }

        // Add new address
        const newAddress = await Customer.create({
            userId,
            address,
            city,
            state,
            country,
            isDefaultAddress: shouldBeDefault,
            phonenumber: req.user.phonenumber || '' // Required field
        });

        res.json({
            status: true,
            message: "Address added successfully",
            data: {
                id: newAddress.id,
                address: newAddress.address,
                city: newAddress.city,
                state: newAddress.state,
                country: newAddress.country,
                isDefaultAddress: newAddress.isDefaultAddress,
                createdAt: newAddress.createdAt
            }
        });

    } catch (error) {
        console.error("Add address error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Update customer address
router.put("/address/:addressId", authenticated, async (req, res) => {
    try {
        const { addressId } = req.params;
        const { address, city, state, country, isDefault } = req.body;
        const userId = req.user.id;

        if (!address || !city || !state || !country) {
            return res.status(400).json({
                status: false,
                message: "All address fields are required"
            });
        }

        // Check if address exists and belongs to user
        const existingAddress = await Customer.findOne({
            where: { id: addressId, userId }
        });

        if (!existingAddress) {
            return res.status(404).json({
                status: false,
                message: "Address not found"
            });
        }

        // If setting as default, unset any existing default
        if (isDefault) {
            await Customer.update(
                { isDefaultAddress: false },
                { where: { userId } }
            );
        }

        // Update address
        const [updatedCount, [updatedAddress]] = await Customer.update(
            {
                address,
                city,
                state,
                country,
                isDefaultAddress: isDefault || false
            },
            {
                where: { id: addressId, userId },
                returning: true
            }
        );

        res.json({
            status: true,
            message: "Address updated successfully",
            data: {
                id: updatedAddress.id,
                address: updatedAddress.address,
                city: updatedAddress.city,
                state: updatedAddress.state,
                country: updatedAddress.country,
                isDefaultAddress: updatedAddress.isDefaultAddress,
                updatedAt: updatedAddress.updatedAt
            }
        });

    } catch (error) {
        console.error("Update address error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

// Delete customer address
router.delete("/address/:addressId", authenticated, async (req, res) => {
    try {
        const { addressId } = req.params;
        const userId = req.user.id;

        // Check if address exists and belongs to user
        const existingAddress = await Customer.findOne({
            where: { id: addressId, userId }
        });

        if (!existingAddress) {
            return res.status(404).json({
                status: false,
                message: "Address not found"
            });
        }

        // Check if this is the only address
        const addressCount = await Customer.count({
            where: { userId }
        });

        if (addressCount <= 1) {
            return res.status(400).json({
                status: false,
                message: "Cannot delete the only address. Please add another address first."
            });
        }

        // If deleting default address, set another address as default
        if (existingAddress.isDefaultAddress) {
            const nextAddress = await Customer.findOne({
                where: { userId, id: { [Op.ne]: addressId } },
                order: [['createdAt', 'DESC']]
            });

            if (nextAddress) {
                await nextAddress.update({ isDefaultAddress: true });
            }
        }

        await existingAddress.destroy();

        res.json({
            status: true,
            message: "Address deleted successfully"
        });

    } catch (error) {
        console.error("Delete address error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

module.exports = router;