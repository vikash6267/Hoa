const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PropertyCommitiSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    position: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },

    account: {
        type: String,
        required: true,
    },

    currency: {
        type: String,
        required: true,
    },
    signature: {
        type: Object,
        default: {
          publicId: "",
          url: "",
        },
      },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category",
     
    },
},{ timestamps: true });

const PropertyCommiti = mongoose.model(
    "PropertyCommiti",
    PropertyCommitiSchema
);

module.exports = PropertyCommiti;
