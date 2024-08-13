const {Sequelize,DataTypes} = require('sequelize');
const connectDb = require("../config/connectDB");
const sequelize = connectDb;
// const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres');
const User = sequelize.define('user', {
    id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        foreignKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        
    },
    roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    verified:{
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    status: {
        type: DataTypes.ENUM('approved', 'declined', 'pending', 'suspended','false','true','activate','deactivate','deactivated','activated','reactivate'),
        allowNull: false,
        defaultValue: 'deactivated',
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Date.now(),
        // defaultValue: DataTypes.fn('now'),
    },
    roleName: {
      type: DataTypes.ENUM,
      values: ["ADMIN","USER"],
  
    }
},{
    hooks:{
      beforeCreate: async (user, options) => {
        switch (user.role_id) {
          case 1:
            user.roleName = "ADMIN";
            break;
          case 2:
            user.roleName = "USER";
            break;
            default:
            break;
        }
 
}, 
        
        // afterFind: async (user,options) => {
        //     delete user.dataValues.password;
        //     console.log("The user\n",user, "The end")
        //     return user;
        // }
        
    }
    
    
}
);


User.sync({})

module.exports = User;


    // add a new field to the schema
    // this field will be used to store the user's cart