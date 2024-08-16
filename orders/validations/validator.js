const { body, validationResult } = require('express-validator');

// Validation middleware
const validateCustomer = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Customer name is empty')
    .isLength({ min: 3 })
    .withMessage('Customer name must be at least 3 characters long'),
  
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),

  body('phonenumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be a valid 10-digit number'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  body('confirmPassword')
    .trim()
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),

  // Middleware to check validation result and send response
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: false, errors: errors.array() });
    }
    next();
  }
];

module.exports = {validateCustomer};
