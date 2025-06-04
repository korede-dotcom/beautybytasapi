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
                p.id AS "productId",
                p.name AS "productName",
                p."categoryId" AS "categoryId",
                p.price,
                p.status,
                p."totalStock",
                p.description,
                p."createdAt",
                c.name AS "categoryName",
                ARRAY_AGG(i."imageUrl") AS images
            FROM 
                products p
            JOIN 
                categories c ON p."categoryId" = c.id
            LEFT JOIN 
                images i ON i."productId" = p.id::text
            WHERE 
                p."categoryId" = :categoryId::uuid
            GROUP BY 
                p.id, c.name
            ORDER BY 
                p."createdAt" DESC;
        `;

      const products = await Category.sequelize.query(query, {
          replacements: { categoryId },
          type: sequelize.QueryTypes.SELECT,
      });

      res.json({ 
          status: true,
          message: "Products retrieved successfully",
          data: products 
      });
  } catch (error) {
      res.status(500).json({ 
          status: false, 
          message: error.message 
      });
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

router.put("/:categoryId", authenticated, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, status } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                status: false,
                message: "Category name is required"
            });
        }

        // Check if category exists
        const category = await Category.findByPk(categoryId);
        if (!category) {
            return res.status(404).json({
                status: false,
                message: "Category not found"
            });
        }

        // Check if new name already exists (excluding current category)
        const existingCategory = await Category.findOne({
            where: {
                name: name,
                id: { [sequelize.Op.ne]: categoryId }
            }
        });

        if (existingCategory) {
            return res.status(400).json({
                status: false,
                message: "Category name already exists"
            });
        }

        // Build the update query dynamically based on provided fields
        let updateFields = ['name = :name'];
        let replacements = {
            name,
            categoryId
        };

        // Only include status in update if it's provided
        if (status !== undefined) {
            updateFields.push('status = :status');
            replacements.status = status;
        }

        // Add updatedAt to the update fields
        updateFields.push('"updatedAt" = CURRENT_TIMESTAMP');

        // Update category using raw query for better control
        const updateQuery = `
            UPDATE categories 
            SET ${updateFields.join(', ')}
            WHERE id = :categoryId::uuid
            RETURNING 
                id AS "categoryId",
                name AS "categoryName",
                status,
                TO_CHAR("createdAt", 'YYYY-MM-DD HH24:MI:SS') AS "createdAt",
                TO_CHAR("updatedAt", 'YYYY-MM-DD HH24:MI:SS') AS "updatedAt";
        `;

        const [updatedCategory] = await Category.sequelize.query(updateQuery, {
            replacements,
            type: sequelize.QueryTypes.UPDATE
        });

        if (!updatedCategory) {
            return res.status(500).json({
                status: false,
                message: "Failed to update category"
            });
        }

        res.json({
            status: true,
            message: "Category updated successfully",
            data: updatedCategory
        });

    } catch (error) {
        console.error("Category update error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});

router.delete("/:categoryId", authenticated, async (req, res) => {
    try {
        const { categoryId } = req.params;

        // Start a transaction
        const transaction = await Category.sequelize.transaction();

        try {
            // Check if category exists
            const category = await Category.findByPk(categoryId);
            if (!category) {
                await transaction.rollback();
                return res.status(404).json({
                    status: false,
                    message: "Category not found"
                });
            }

            // Delete all images associated with products in this category
            const deleteImagesQuery = `
                DELETE FROM images
                WHERE "productId" IN (
                    SELECT id FROM products WHERE "categoryId" = :categoryId::uuid
                );
            `;
            await Category.sequelize.query(deleteImagesQuery, {
                replacements: { categoryId },
                type: sequelize.QueryTypes.DELETE,
                transaction
            });

            // Delete all products in this category
            const deleteProductsQuery = `
                DELETE FROM products
                WHERE "categoryId" = :categoryId::uuid;
            `;
            await Category.sequelize.query(deleteProductsQuery, {
                replacements: { categoryId },
                type: sequelize.QueryTypes.DELETE,
                transaction
            });

            // Delete the category
            const deleteCategoryQuery = `
                DELETE FROM categories
                WHERE id = :categoryId::uuid
                RETURNING 
                    id AS "categoryId",
                    name AS "categoryName",
                    status,
                    TO_CHAR("createdAt", 'YYYY-MM-DD HH24:MI:SS') AS "createdAt",
                    TO_CHAR("updatedAt", 'YYYY-MM-DD HH24:MI:SS') AS "updatedAt";
            `;
            const [deletedCategory] = await Category.sequelize.query(deleteCategoryQuery, {
                replacements: { categoryId },
                type: sequelize.QueryTypes.DELETE,
                transaction
            });

            // Commit the transaction
            await transaction.commit();

            res.json({
                status: true,
                message: "Category and associated products deleted successfully",
                data: deletedCategory
            });

        } catch (error) {
            // Rollback the transaction in case of error
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error("Category deletion error:", error);
        res.status(500).json({
            status: false,
            message: error.message
        });
    }
});












module.exports = router;