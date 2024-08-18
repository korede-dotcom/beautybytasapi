const { authenticated } = require("../middleware/auth");
const Category = require("../models/Category");
const sequelize = require("sequelize");
const router = require("express").Router()




router.get('/products', async (req, res) => {
  try {
    let baseQuery = `
            SELECT
                p.id AS productId,
                p.name AS productName,
                p.price AS productPrice,
                p.description AS productDescription,
                p.status AS productStatus,
                TO_CHAR(p."createdAt", 'YYYY-MM-DD HH24:MI:SS') AS createdAt,
                COALESCE(json_agg(json_build_object(
                    'imageId', i.id,
                    'imageUrl', i.url
                )) FILTER (WHERE i.id IS NOT NULL), '[]') AS images
            FROM 
                products p
            LEFT JOIN 
                images i ON p.id = i."productId"
        `;

        if (req.query.categoryId) {
            baseQuery += ` WHERE p."categoryId" = :categoryId::uuid`;
        }

        baseQuery += `
            GROUP BY p.id
            ORDER BY p."createdAt"
            LIMIT :limit OFFSET :offset;
        `;


 const products = await Category.sequelize.query(baseQuery, {
          replacements: {
              categoryId: req.query.categoryId,
              limit: parseInt(req.query.limit, 10) || 10,
              offset: parseInt(req.query.offset, 10) || 0
          },
          type: sequelize.QueryTypes.SELECT
      });

      // Return the result as JSON
      res.json({ data: products, status: true });
  } catch (error) {
      // Handle errors and return an error responseconsole.error('Error fetching products:', error);
      res.status(500).json({ status: false, error: error.message });
  }
});

router.get('/:categoryId/products', async (req, res) => {
  try {
      const { categoryId } = req.params;

      const query = `
            SELECT 
                p.id::text AS productId,  -- Cast productId to text
                p.name AS productName,
                p."categoryId"::text AS categoryId,  -- Cast categoryId to text
                p.price,
                p.status,
                p."totalStock",
                p.description,
                p."createdAt",
                c.name AS categoryName,
                ARRAY_AGG(i."imageUrl") AS images
            FROM 
                products p
            JOIN 
                categories c ON p."categoryId"::text = c.id::text  -- Cast both to text
            LEFT JOIN 
                images i ON i."productId"::text = p.id::text  -- Cast both to text
            WHERE 
                p."categoryId"::text = :categoryId  -- No need to cast again here
            GROUP BY 
                p.id, c.name
            ORDER BY 
                p."createdAt" DESC;
        `;


      const products = await Category.sequelize.query(query, {
          replacements: { categoryId },
          type: sequelize.QueryTypes.SELECT,
      });

      res.json({ data: products, status: true });
  } catch (error) {
      res.status(500).json({ error: error.message, status: false });
  }
});



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

router.get("/client", async (req, res) => {
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
  


router.post("/",authenticated,async (req,res) => {
    try {
        const {name} = req.body;
        if (!name.length) {
            return res.status(400).json({status:false,message:"category name is empty"})
        }
        const  findCategory  = await Category.findOne({where:{name:name}})
        if (findCategory) {
            return res.status(400).json({status:false,message:"category name already exists"})
        }
        const createProduct = await Category.create({name:name})
        return res.status(201).json({status:true,message:"category created",createProduct})
    } catch (error) {
        res.json({status:false,message:error.message})
    }
})










module.exports = router;