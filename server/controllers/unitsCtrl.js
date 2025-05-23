const unitsModel = require("../models/unitsModel");

const createUnitsCtrl = async (req, res) => {
    const {
        propertyData: { type, fee, categoryId, currency },
    } = req.body;

    // Function to generate a 6-digit unique unitCode
    const generateUnitCode = () => {
        const randomNumber = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
        return randomNumber.toString();  // Convert to string
    };

    try {
        if (!type || !fee ) {
            return res.status(400).json({
                success: false,
                message: "Please Provide All Fields",
            });
        }

        const unitCode = generateUnitCode();  // Generate unique 6-digit unitCode

        const property = await unitsModel.create({
            type,
            fee,
            categoryId,
            currency,
            unitCode,  // Store generated unitCode
        });

        return res.status(201).json({
            success: true,
            message: "Units created successfully!",
            property,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Error in create units API",
        });
    }
};




const deleteUnitsCtrl = async (req, res) => {
    const { id } = req.params;
    try {
        const deleteProperty = await unitsModel.findByIdAndDelete(id);
        if (!deleteProperty) {
            return res.status(404).json({ success: false, message: "Property not found" });
        }
        res.status(200).json({
            success: true,
            message: "Units deleted successfully",
            property: deleteProperty,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



const getAllUnitsCtrl = async (req, res) => {
    const { id } = req.params;
    try {
        const properties = await unitsModel.find({ categoryId: id });
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



















module.exports = {
    createUnitsCtrl,
    deleteUnitsCtrl,
    getAllUnitsCtrl,
};
