const {Sequelize,DataTypes} = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;
// const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres');
const Product = sequelize.define('product', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        foreignKey: true,
    },
    categoryId:{
        type: Sequelize.UUID,
        allowNull: false,
    },
    name:{
        type:DataTypes.STRING,
        allowNull: false,
    },
    description:{
        type:DataTypes.STRING,
        allowNull: false,
    },
    price:{
        type:DataTypes.DOUBLE,
        defaultValue:"0.0"
    },
    userId: {
        type: Sequelize.UUID,
        allowNull: false,
    },
    totalStock:{
        type:DataTypes.INTEGER,
        allowNull:false,
        defaultValue:1
    },
    status:{
        type:DataTypes.BOOLEAN,
        allowNull:false,
        defaultValue:true,
    }
   
});


Product.sync({alter:true})

module.exports = Product;


    // add a new field to the schema
    // this field will be used to store the user's cart