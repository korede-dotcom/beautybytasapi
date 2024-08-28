
const {Sequelize,DataTypes} = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;
// const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres');
const Cart = sequelize.define('cart', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        foreignKey: true,
    },
    cookie:{
        type:DataTypes.STRING,
        allowNull: false,
    },
    productId:{
        type: Sequelize.UUID,
        allowNull: false,
    }, 
});


Cart.sync({alter:true})

module.exports = {Cart:Cart};
