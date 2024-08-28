const {Sequelize,DataTypes} = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;
// const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres');
const Cart = sequelize.define('cart', {
    cookie:{
        type:DataTypes.STRING,
        allowNull: false,
    },
    productId:{
        type: Sequelize.UUID,
        allowNull: false,
    }, 
});


Cart.sync({})

module.exports = Cart;


    // add a new field to the schema
    // this field will be used to store the user's cart