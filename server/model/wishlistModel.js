const mongoose = require('mongoose');
const { ObjectID } = require('bson')

const wishlistSchema = new mongoose.Schema({
    owner : {
      type: String,
       required: true
    },
    items: [{
        itemId: {
            type: ObjectID,
            required: true
        },
        productName: {
            type : String
        },
        category : {
            type : String,
            required : true
        },
        image1 : {
            type : String, 
            required : true
        }
    }]
}, {timestamps: true})


const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist

