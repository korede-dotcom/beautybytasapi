const { authenticated } = require("../middleware/auth");
const Blogs = require("../models/Blog");
const {validateCreateBlog} = require("./validations/validator");
const router = require("express").Router()

router.get("/", authenticated, async (req, res) => {
  try {
      const { QueryTypes } = require('sequelize');

      // If the query parameter "type" is "all", return all blogs without pagination
      if (req.query.type === "all") {
          const query = `
          SELECT
              b.id AS blogId,
              b.title AS blogTitle,
              b.status AS status,
              b."coverImage" AS coverImage,
              b."textContent" AS textContent,
              TO_CHAR(b."createdAt", 'YYYY-MM-DD HH24:MI:SS') AS createdAt,
              TO_CHAR(b."updatedAt", 'YYYY-MM-DD HH24:MI:SS') AS updatedAt
          FROM blogs b
          ORDER BY b."createdAt" DESC
          `;

          // Execute the query
          const blogs = await Blogs.sequelize.query(query);
          console.log("🚀 ~ router.get ~ blogs:", blogs);

          return res.status(200).json({
              status: true,
              message: "blogs",
              blogs: blogs[0] || [],
          });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;

      // SQL query to get paginated blogs
      const query = `
          SELECT
              b.id AS blogId,
              b.title AS blogTitle,
              b.status AS status,
              b."coverImage" AS coverImage,
              b."textContent" AS textContent,
              TO_CHAR(b."createdAt", 'YYYY-MM-DD HH24:MI:SS') AS createdAt,
              TO_CHAR(b."updatedAt", 'YYYY-MM-DD HH24:MI:SS') AS updatedAt
          FROM blogs b
          ORDER BY b."createdAt"
          LIMIT :limit OFFSET :offset;
      `;

      // Execute the query with parameter replacements
      const blogs = await Blogs.sequelize.query(query, {
          replacements: { limit, offset },
          type: QueryTypes.SELECT
      });

      // Query to get total number of blogs
      const countQuery = `
        SELECT COUNT(DISTINCT b.id) AS count
        FROM blogs b;
      `;

      // Execute the count query
      const countResult = await Blogs.sequelize.query(countQuery, {
          type: QueryTypes.SELECT
      });
      const totalItems = parseInt(countResult[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      // Return the paginated result
      return res.status(200).json({
          status: true,
          message: "blogs",
          blogs,
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

  


router.post("/",validateCreateBlog,authenticated,async (req,res) => {
    try {
        const createBlogs = await Blogs.create({...req.body,status:true})
        return res.status(201).json({status:true,message:"blogs created",createBlogs})
    } catch (error) {
        res.json({status:false,message:error.message})
    }
})

router.get("/toggle/:id",authenticated,async(req,res) => {
  try {
    const {id} = req.params.id
    const blog = await Blogs.findByPk(id)
    if (!blog) {
      return res.status(404).json({status:false,message:"blog not found"})
    }
    blog.status =!blog.status
    await blog.save()
    return res.status(200).json({status:true,message:"blog status toggled",blog})

  } catch (error) {
    return res.status(500).json({status:false,message:"error toggling"})
  }
})










module.exports = router;