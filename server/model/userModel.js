const mongoose = require('mongoose');
const { PhoneNumberContext } = require('twilio/lib/rest/lookups/v1/phoneNumber');

const Schema = mongoose.Schema

const UserSchema = new Schema({
    name : {
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true
    },
    mobile : {
        type : String,
        required : true
    },
    password : {
        type : String,
        required : true
    },
    blockStatus : {
        type : Boolean,
    },
    address : [{
        name : { type : String },
        mobile : { type : Number },
        address1 : { type : String},
        address2 : { type : String},
        city : { type : String },
        state : { type : String },
        zip : { type : Number } 

    }],
    avatar : {
        type : String, 
        required : true
    }
}, { timestamps : true }) 


const User = mongoose.model('User', UserSchema);

module.exports = User
