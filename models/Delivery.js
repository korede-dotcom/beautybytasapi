const {Sequelize,DataTypes} = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;
// const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres');
const Delivery = sequelize.define('delivery', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        foreignKey: true,
    },
    orderId:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    deliveryFee: {
        type: DataTypes.DOUBLE,
        defaultValue:"0.0"
    },
    city: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    postalCode: {
        type: DataTypes.STRING,
       
    },
    state: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    country: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW,
    },
    status: {
        type: DataTypes.ENUM('sentout', 'delivered', 'pending','initiated'),
        allowNull: false,
        defaultValue: 'initiated',
    },
    
   
});


Delivery.sync({force:true})

module.exports = Delivery;


    // add a new field to the schema
    // this field will be used to store the user's cart