const {Sequelize,DataTypes} = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;

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
    }
}, {
    tableName: 'images',
    timestamps: true
});

Image.sync({alter: true})

module.exports = Image;


    // add a new field to the schema
    // this field will be used to store the user's cart