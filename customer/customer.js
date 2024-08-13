const connectDB = require("../config/connectDB");
const { authenticated } = require("../middleware/auth");
const Category = require("../models/Category");
const Customer = require("../models/Customer");
const User = require("../models/User");
const {validateCustomer} = require("./validations/validator");
const router = require("express").Router()
const bcrypt = require("bcryptjs");

router.get("/", authenticated, async (req, res) => {
    try {
        const { QueryTypes } = require('sequelize'); // Ensure QueryTypes is imported if using CommonJS
        // Or if using ES modules:
        // import { QueryTypes } from 'sequelize';

        if(req.query.type === "all"){
            const query = `
            SELECT
                c.id AS categoryId,
                c.name AS categoryName,
                c.status AS status,
                COUNT(p.id)::integer AS productCount,
                TO_CHAR(c."createdAt", 'YYYY-MM-DD HH24:MI:SS') AS createdAt
            FROM categories c
            LEFT JOIN products p ON p."categoryId" = c.id::text::uuid
            GROUP BY c.id, c.name, c.status, c."createdAt"
            ORDER BY c."createdAt" DESC
            `;

        
        // Execute the query with parameter replacements
        const categories = await Category.sequelize.query(query);
        console.log("🚀 ~ router.get ~ categories:", categories)
        return res.status(200).json({
            status: true,
            message: "categories",
            categories:categories[0] || [],
          
          });
        
        }
        
        const page = parseInt(req.query.page , 10) || 1;
        const limit = parseInt(req.query.limit , 10) || 10;
        const offset = (page - 1) * limit;
        
        // SQL query to get paginated categories and their product counts
        const query = `
            SELECT
                c.id AS categoryId,
                c.name AS categoryName,
                c.status AS status,
                COUNT(p.id)::integer AS productCount,
                TO_CHAR(c."createdAt", 'YYYY-MM-DD HH24:MI:SS') AS createdAt
            FROM categories c
            LEFT JOIN products p ON p."categoryId" = c.id::text::uuid
            GROUP BY c.id, c.name, c.status, c."createdAt"
            ORDER BY c."createdAt"
            LIMIT :limit OFFSET :offset;
            `;

        
        // Execute the query with parameter replacements
        const categories = await Category.sequelize.query(query, {
          replacements: { limit, offset },
          type: QueryTypes.SELECT // Ensure QueryTypes is imported correctly
        });
        
        // Query to get total number of categories
        const countQuery = `
          SELECT COUNT(DISTINCT c.id) AS count
          FROM categories c
          LEFT JOIN products p ON p."categoryId" = c.id::text::uuid;
        `;
        
        // Execute the count query
        const countResult = await Category.sequelize.query(countQuery, {
          type: QueryTypes.SELECT // Ensure QueryTypes is imported correctly
        });
        const totalItems = parseInt(countResult[0].count, 10);
        const totalPages = Math.ceil(totalItems / limit);
        
        // Return the paginated result
        return res.status(200).json({
          status: true,
          message: "categories",
          categories,
          pagination: {
            totalItems,
            totalPages,
            currentPage: page,
            itemsPerPage: limit,
          },
        });

    
    } catch (error) {
      res.json({ status: false, message: error.message });
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