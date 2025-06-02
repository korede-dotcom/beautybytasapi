const {Sequelize,DataTypes} = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;
// const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres');
const Order = sequelize.define('order', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        foreignKey: true,
    },
    reference:{
        type:DataTypes.STRING,
        allowNull: false,
    },
    productId:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    productName:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    customerName:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    amount: {
        type: DataTypes.DOUBLE,
        allowNull: false,
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
    },
    quantity:{
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW,
    },
    status: {
        type: DataTypes.ENUM('success', 'declined', 'pending','initiated'),
        allowNull: false,
        defaultValue: 'initiated',
    },
    
   
});


Order.sync({alter:true})

module.exports = Order;


    // add a new field to the schema
    // this field will be used to store the user's cart