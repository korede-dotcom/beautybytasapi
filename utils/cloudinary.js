const cloudinary = require('cloudinary').v2;


cloudinary.config({ 
  cloud_name: process.env.c_Name, 
  api_key: process.env.c_Key, 
  api_secret: process.env.c_Secret,
  });

    module.exports = cloudinary;