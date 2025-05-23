const multer = require("multer");
const fs = require("fs");
const path = require("path");

const Unit = require("../models/unitsModel");
const PropertyInfo = require("../models/PropertyInformationsModel");
const PropertyComitte = require("../models/PropertyCommitiModel");
const Owner = require("../models/outcomeModel");
const Outcome = require("../models/outcomeModel");
const Income = require("../models/Income");
const Category = require("../models/categoryModel");
const BudgetOutcome = require("../models/budgetOutcomeModel");
const Budget = require("../models/budgetModel");
const BudgetIncome = require("../models/budgetIncomeModel");

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // Ensure this folder exists
    },
    filename: function (req, file, cb) {
        cb(null, "backup.json"); // Always overwrite the previous backup file
    }
});

// File filter (only allow JSON)
const fileFilter = (req, file, cb) => {
    if (path.extname(file.originalname) === ".json") {
        cb(null, true);
    } else {
        cb(new Error("Only JSON files are allowed"), false);
    }
};

// Setup Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Restore Function
const restore = async (req, res) => {
    try {
        const backupData = req.body; // JSON data directly from frontend

        if (!backupData) {
            return res.status(400).json({ message: "No data provided" });
        }


        console.log(backupData.budgetOutcomeData)
        // Restore Data
        await Unit.deleteMany({});
        await Unit.insertMany(backupData.unitData || []);

        await PropertyInfo.deleteMany({});
        await PropertyInfo.insertMany(backupData.propertyInfoData || []);

        await PropertyComitte.deleteMany({});
        await PropertyComitte.insertMany(backupData.propertyComitteData || []);

        await Owner.deleteMany({});
        await Owner.insertMany(backupData.ownerData || []);

        await Outcome.deleteMany({});
        await Outcome.insertMany(backupData.outcomeData || []);

        await Income.deleteMany({});
        await Income.insertMany(backupData.incomeData || []);

        await Category.deleteMany({});
        await Category.insertMany(backupData.categoryData || []);

        await BudgetOutcome.deleteMany({});
        await BudgetOutcome.insertMany(backupData.budgetOutcomeData || []);

        await Budget.deleteMany({});
        await Budget.insertMany(backupData.budgetData || []);

        await BudgetIncome.deleteMany({});
        await BudgetIncome.insertMany(backupData.budgetIncomeData || []);

        res.status(200).json({ message: "Backup successfully restored!" });
    } catch (err) {
        console.error("Restore Error:", err);
        res.status(500).json({ message: "Error restoring backup", error: err.message });
    }
};

module.exports = { restore, upload };
