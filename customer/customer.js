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

      // SQL query to get paginated customers and their associated user data
      const query = `
          SELECT
              u.name AS userName,
              u.email AS userEmail,
              c.id AS customerId,
              c.phonenumber AS phoneNumber,
              c.address AS address,
              TO_CHAR(c."createdAt", 'YYYY-MM-DD HH24:MI:SS') AS createdAt
          FROM customers c
          INNER JOIN users u ON u.id = c."userId"::uuid
          ORDER BY c."createdAt"
          LIMIT :limit OFFSET :offset;
      `;

      // Execute the query with parameter replacements
      const customers = await Customer.sequelize.query(query, {
          replacements: { limit, offset },
          type: QueryTypes.SELECT // Ensure QueryTypes is imported correctly
      });

      // Query to get total number of customers
      const countQuery = `
          SELECT COUNT(c.id) AS count
          FROM customers c;
      `;

      // Execute the count query
      const countResult = await Customer.sequelize.query(countQuery, {
          type: QueryTypes.SELECT // Ensure QueryTypes is imported correctly
      });

      const totalItems = parseInt(countResult[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      // Return the paginated result
      return res.status(200).json({
          status: true,
          message: "customers",
          customers,
          pagination: {
              totalItems,
              totalPages,
              currentPage: page,
              itemsPerPage: limit,
          },
      });

  } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
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