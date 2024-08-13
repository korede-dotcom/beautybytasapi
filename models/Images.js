const {Sequelize,DataTypes} = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;
// const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres');
const Image = sequelize.define('image', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        foreignKey: true,
    },
    productId:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    imageUrl:{
        type: DataTypes.STRING,
        allowNull: false,
    },

   
});


Image.sync({})

module.exports = Image;


    // add a new field to the schema
    // this field will be used to store the user's cart