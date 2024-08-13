const {Sequelize,DataTypes} = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;
// const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres');
const Category = sequelize.define('categories', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        foreignKey: true,
    },
    name:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    status:{
        type:DataTypes.BOOLEAN,
        defaultValue:true
    }
});


Category.sync({alter:true})

module.exports = Category;


    // add a new field to the schema
    // this field will be used to store the user's cart