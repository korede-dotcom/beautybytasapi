const connectDB = require("../config/connectDB");
const { authenticated } = require("../middleware/auth");
const Category = require("../models/Category");
const Customer = require("../models/Customer");
const User = require("../models/User");
const {validateCustomer} = require("./validations/validator");
const router = require("express").Router()
const bcrypt = require("bcryptjs");
const { QueryTypes } = require('sequelize');

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
                u.email as "userEmail"
            FROM customers c
            INNER JOIN users u ON u.id = c."userId"::uuid
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
  



module.exports = router;