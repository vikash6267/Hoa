const PropertyCommitiModel = require("../models/PropertyCommitiModel");

const createPropertyCommitiCtrl = async (req, res) => {
    const {
        propertyData: { name, position, phone, email, account, currency, categoryId,signature },
    } = req.body;


    try {
        if (!name || !position || !phone || !email || !account || !currency) {
            return res.status(400).json({
                success: false,
                message: "Please Provide All Fields",
            });
        }

        const property = await PropertyCommitiModel.create({
            name, position, phone, email, account, currency, categoryId,signature
        });

        return res.status(201).json({
            success: true,
            message: "Property Committi created successfully!",
            property,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error in create category API",
        });
    }
};


const updatePropertyCommitiCtrl = async (req, res) => {
    const {
        id, name, position, phone, email, account, currency, signature
    } = req.body;


    console.log(req.body)

    
    try {
        if (!id || !name || !position || !phone || !email || !account || !currency) {
            return res.status(400).json({
                success: false,
                message: "Please Provide All Fields",
            });
        }

        const property = await PropertyCommitiModel.findById(id);

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property Committi not found!",
            });
        }

        // Update the property with new data
        property.name = name;
        property.position = position;
        property.phone = phone;
        property.email = email;
        property.account = account;
        property.currency = currency;
        property.signature = signature;
      

        await property.save();

        return res.status(200).json({
            success: true,
            message: "Property Committi updated successfully!",
            property,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error in update category API",
        });
    }
};


const deletePropertyCommitiCtrl = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteProperty = await PropertyCommitiModel.findByIdAndDelete(id);
        if (!deleteProperty) {
            return res.status(404).json({ success: false, message: "Property not found" });
        }
        res.status(200).json({
            success: true,
            message: "Property Commiti deleted successfully",
            property: deleteProperty,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



const getAllPropertyCommitiCtrl = async (req, res) => {
    const { id } = req.params;
    try {
        const properties = await PropertyCommitiModel.find({ categoryId: id });



        res.json({
            success: true,
            properties,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching property information.",
            error: error.message,
        });
    }
};
const getPropertyCommitiCtrl = async (req, res) => {
    try {
        const properties = await PropertyCommitiModel.find();



        res.json({
            success: true,
            properties,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching property information.",
            error: error.message,
        });
    }
};












const getPropertyCommitiByIdCtrl = async (req, res) => {
    const { id } = req.params; // Getting the ID from the request params

    try {
        const property = await PropertyCommitiModel.findById(id);

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property Committi not found!",
            });
        }

        return res.status(200).json({
            success: true,
            property,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error in fetching property!",
        });
    }
};







module.exports = {
    createPropertyCommitiCtrl,
    getAllPropertyCommitiCtrl,
    deletePropertyCommitiCtrl,
    getPropertyCommitiCtrl,
    updatePropertyCommitiCtrl,
    getPropertyCommitiByIdCtrl
};
