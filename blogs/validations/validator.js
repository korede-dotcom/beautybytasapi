const { body, validationResult } = require('express-validator');

// Validation middleware
const validateCreateBlog = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Customer title is empty')
    .isLength({ min: 3 })
    .withMessage('title  must be at least 3 characters long'),
  body('coverImage')
    .trim()
    .notEmpty()
    .withMessage('coverImage is empty'),
  body('textContent')
    .trim()
    .notEmpty()
    .withMessage('textContent is required'),

  // Middleware to check validation result and send response
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: false, errors: errors.array() });
    }
    next();
  }
];

module.exports = {validateCreateBlog};
