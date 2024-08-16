const {Sequelize,DataTypes} = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;
// const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres');
const Blog = sequelize.define('blog', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        foreignKey: true,
    },
    title:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    coverImage:{
        type: DataTypes.STRING,
    },
    textContent:{
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status:{
        type:DataTypes.BOOLEAN,
        defaultValue:true
    },
    likes:{
        type: DataTypes.INTEGER,
        defaultValue:0,
    },
    unlikes:{
        type: DataTypes.INTEGER,
        defaultValue:0,
    }
});


Blog.sync({alter:true})

module.exports = Blog;


    // add a new field to the schema
    // this field will be used to store the user's cart