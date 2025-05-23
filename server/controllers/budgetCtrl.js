const budgetModel = require("../models/budgetModel");
const budgetIncomeModel = require("../models/budgetIncomeModel")
const budgetOutcomeModel = require("../models/budgetOutcomeModel")
const ownerModel = require("../models/ownerModel");
const Category = require("../models/categoryModel");

const createbudget = async (req, res) => {
  const { name } = req.body;
  const CateId = name.id
  console.log(CateId)
const income = await ownerModel.find({categoryId:CateId})
const catDetails = await Category.findById(CateId)



  
  try {
    const newCategory = new budgetModel({
        name:name.name,
        serachUpdateId:CateId,
        currency:catDetails.currency || "USD"
    });

    console.log(newCategory)
    
    await newCategory.save();

    const result = await Promise.all(
      income.map(async (owner) => {
        return await budgetIncomeModel.create({
          name: owner.name,
          amount: 0,
          categoryId:newCategory._id,
          uniqueId:owner.uniqueId,
        currency:catDetails.currency || "USD"

        });
      })
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Budget created successfully",
        category: newCategory,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error in create budget api" });
  }
};


const deletebudget = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedCategory = await budgetModel.findByIdAndDelete(id);
    if (!deletedCategory) {
      return res.status(404).json({ success: false, message: "Budget not found" });
    }
    const modelsToUpdate = [
      budgetIncomeModel,
      budgetOutcomeModel
    ];

    await Promise.all(
      modelsToUpdate.map((model) =>
        model.updateMany(
          { categoryId: id },
          { $unset: { categoryId: "" } }
        )
      )
    );

    res.status(200).json({
      success: true,
      message: "Budget deleted successfully",
      category: deletedCategory,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getAllbudgets = async (req, res) => {
  try {
  const { id } = req.params;

    
    const categories = await budgetModel.find({serachUpdateId:id});
    console.log(categories)
    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message });
  }
};
const updateBudgetCtrl = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updatedCategory = await budgetModel.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "budget not found" });
    }

    return res.json(updatedCategory);
  } catch (error) {
    console.error("Error updating budget:", error);
    return res.status(500).json({ message: "Error updating budget" });
  }

};

















module.exports = {
  createbudget,
  deletebudget,
  getAllbudgets,
  updateBudgetCtrl
};
