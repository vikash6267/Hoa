const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PropertyInformationsSchema = new Schema({
    pName: {
        type: String,
        required: true,
    },
    pAddress: {
        type: String,
       
    },
    pLocation: {
        type: String,
  
    },
    ownerTitle: {
        type: String,
      
    },
    currency: {
        type: String,
        required: true,
    },
    images: [
        {
            public_id: String,
            url: String,
        },
    ],
    numberOfunits: {
        type: String,
       
    },
    logo: {
        type: Object,
        default: {
          publicId: "",
          url: "",
        },
      },
    categoryId: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
});

const PropertyInformations = mongoose.model(
    "PropertyInformations",
    PropertyInformationsSchema
);

module.exports = PropertyInformations;
