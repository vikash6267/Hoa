const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
    ownerName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    unit: {
        type: String,
        required: true,
    },
    months: {
        January: { type: Number, default: 0 },
        February: { type: Number, default: 0 },
        March: { type: Number, default: 0 },
        April: { type: Number, default: 0 },
        May: { type: Number, default: 0 },
        June: { type: Number, default: 0 },
        July: { type: Number, default: 0 },
        August: { type: Number, default: 0 },
        September: { type: Number, default: 0 },
        October: { type: Number, default: 0 },
        November: { type: Number, default: 0 },
        December: { type: Number, default: 0 },
    },
    contribution: {
        type: Number,
        default: 0,
    },
    totalAmount: {
        type: Number,
        default: 0,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    updateLog: [
        {
            date: { type: Date, default: Date.now },
            updatedFields: { type: Map, of: String }, // Logs changed fields and their values
            operation:{type:String}

        },
    ],
}, { timestamps: true });

incomeSchema.pre('save', function (next) {
    const months = this.months;
    this.totalAmount = Object.values(months).reduce((acc, curr) => acc + curr, 0);
    next();
});

incomeSchema.pre("updateOne", function (next) {
    const update = this.getUpdate();

    if (update.$set || update.$inc) {
        const logEntry = {
            date: new Date(),
            updatedFields: new Map(Object.entries(update.$set || {})),
        };

        // Push the log entry into updateLog
        this.update({}, { $push: { updateLog: logEntry } });
    }
    next();
});
const Income = mongoose.model('Income', incomeSchema);

module.exports = Income;
