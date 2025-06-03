const {Sequelize,DataTypes} = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;
const Product = require('./Product');
// const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres');
const Image = sequelize.define('image', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        foreignKey: true,
    },
    productId:{
        type: Sequelize.UUID,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    imageUrl:{
        type: DataTypes.STRING,
        allowNull: false,
    },

   
});

// Define the association
Image.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'product'
});

Product.hasMany(Image, {
    foreignKey: 'productId',
    as: 'images'
});

Image.sync({})

module.exports = Image;


    // add a new field to the schema
    // this field will be used to store the user's cart