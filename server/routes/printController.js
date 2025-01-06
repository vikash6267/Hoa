const PDFDocument = require("pdfkit");
const fs = require("fs");
const QRCode = require("qrcode");
const axios = require("axios"); // Import axios to handle image URL
const express = require("express");

const router = express.Router();

const PropertyInformations = require("../models/PropertyInformationsModel");
const PropertyCommiti = require("../models/PropertyCommitiModel");
const Units = require("../models/unitsModel");
const Owner = require("../models/ownerModel");
const Income = require("../models/Income");

const generatePropertyPDF = async (req, res) => {
  try {
    const properties = await PropertyInformations.find().populate("categoryId"); // Fetch all properties
    if (!properties || properties.length === 0) {
      throw new Error("No properties found");
    }

    const doc = new PDFDocument({ margin: 40 });

    // Define the output file path
    const outputDir = `/output/`;
    const filePath = `${outputDir}properties.pdf`;

    // Ensure the directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true }); // Create the directory if it doesn't exist
    }

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream); // Pipe the document to the file

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const category = property.categoryId;

      // Fetch the logo image as a buffer
      let logoBuffer = null;
      if (property.logo?.url && property.logo.url.startsWith("http")) {
        const response = await axios.get(property.logo.url, {
          responseType: "arraybuffer",
        });
        logoBuffer = Buffer.from(response.data, "binary");
      } else if (property.logo?.url) {
        logoBuffer = fs.readFileSync(property.logo.url); // Local image
      }

      // Add rounded logo (centered at the top of the page)
      if (logoBuffer) {
        const logoSize = 80; // Size of the logo
        const x = (doc.page.width - logoSize) / 2; // Center the logo horizontally
        const y = 40; // Position from the top
        doc
          .save()
          .rect(x, y, logoSize, logoSize) // Create a square area for the logo
          .clip() // Clip the image to the rounded rectangle
          .image(logoBuffer, x, y, { width: logoSize, height: logoSize })
          .restore();
      }

      // Add property details
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(`Property Details: ${property.pName}`, 40, 150, {
          align: "center",
        })
        .moveDown();

      doc
        .fontSize(12)
        .font("Helvetica")
        .text(`Property Name       : ${property.pName}`)
        .text(`Property Address    : ${property.pAddress}`)
        .text(`Ownership Title     : ${property.ownerTitle}`)
        .text(`Number of Units     : ${property.numberOfunits}`)
        .moveDown(1);

      // Generate QR Code for each property
      const qrData = {
        property: {
          name: property.pName,
          address: property.pAddress,
          ownershipTitle: property.ownerTitle,
          numberOfUnits: property.numberOfunits,
        },
      };

      const qrCodePath = `${outputDir}qr-${i}.png`;
      await QRCode.toFile(qrCodePath, JSON.stringify(qrData)); // Save QR code to file

      // Get the size of the QR code to center it horizontally
      const qrSize = 150; // Define the size of the QR code

      // Calculate the position to center the QR code horizontally
      const qrX = (doc.page.width - qrSize) / 2; // Center horizontally

      // Embed QR Code in the PDF (centered horizontally only)
      doc
        .text("Scan the QR Code below to view details:", { align: "center" })
        .image(qrCodePath, qrX, 310, { width: qrSize, height: qrSize }); // Position QR code

      // Add a page for the next property
      if (i < properties.length - 1) {
        doc.addPage();
      }
    }

    doc.end(); // Finalize the PDF

    // Send the file for download
    writeStream.on("finish", () => {
      res.download(filePath, `properties.pdf`, (err) => {
        if (err) {
          console.error("Error sending PDF:", err);
        }
        // Clean up temporary files
        fs.unlinkSync(filePath);
        for (let i = 0; i < properties.length; i++) {
          const qrCodePath = `${outputDir}qr-${i}.png`;
          fs.unlinkSync(qrCodePath);
        }
      });
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("An error occurred while generating the PDF.");
  }
};

const generatePropertyPDFcommiti = async (req, res) => {
  try {
    // Fetch all property committee data
    const propertyCommittees = await PropertyCommiti.find().populate(
      "categoryId"
    );

    if (propertyCommittees.length === 0) {
      return res.status(404).send("No property committees found.");
    }

    const outputDir = `/output/`;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true }); // Ensure the output directory exists
    }

    const filePath = `${outputDir}property_committee.pdf`;
    const doc = new PDFDocument({ margin: 40 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream); // Pipe the document to the file

    // Title
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Property Committee Details", 40, 100, { align: "center" })
      .moveDown();

    // Table Headers
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Order", 40, 150)
      .text("Full Name", 120, 150)
      .text("Position", 250, 150)
      .text("Phone", 370, 150)
      .text("Email", 480, 150)
      .moveDown(1);

    // Add each property committee data in the table
    let yPosition = 170;
    for (let i = 0; i < propertyCommittees.length; i++) {
      const committee = propertyCommittees[i];
      const order = i + 1;
      const fullName = committee.name;
      const position = committee.position;
      const phone = committee.phone;
      const email = committee.email;

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(order.toString(), 40, yPosition)
        .text(fullName, 120, yPosition)
        .text(position, 250, yPosition)
        .text(phone, 370, yPosition)
        .text(email, 480, yPosition);

      yPosition += 20; // Move down for the next row

      // If we're getting close to the end of the page, add a new page
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40; // Reset y-position for the new page
      }

      // Generate the QR code for the current committee with all its details
      const qrData = {
        name: committee.name,
        position: committee.position,
        phone: committee.phone,
        email: committee.email,
        category: committee.categoryId ? committee.categoryId.name : "N/A",
      };

      const qrCodePath = `${outputDir}qr-${i}.png`;
      await QRCode.toFile(qrCodePath, JSON.stringify(qrData)); // Save QR code to file
    }

    // Add text before QR code and center the QR code
    let qrYPosition = yPosition + 20; // Adjust QR code placement after table

    // Centered QR code
    const qrSize = 150; // Define the size of the QR code
    const qrX = (doc.page.width - qrSize) / 2; // Center horizontally

    for (let i = 0; i < propertyCommittees.length; i++) {
      const qrCodePath = `${outputDir}qr-${i}.png`;
      doc.image(qrCodePath, qrX, qrYPosition, {
        width: qrSize,
        height: qrSize,
      }); // Position QR code
      qrYPosition += 180; // Move down for the next QR code
    }

    doc.end(); // Finalize the PDF

    // Send the file for download
    writeStream.on("finish", () => {
      res.download(filePath, `property_committee.pdf`, (err) => {
        if (err) {
          console.error("Error sending PDF:", err);
        }
        // Clean up temporary files
        propertyCommittees.forEach((_, index) => {
          const qrCodePath = `${outputDir}qr-${index}.png`;
          fs.unlinkSync(qrCodePath); // Clean up individual QR code images
        });
        fs.unlinkSync(filePath); // Clean up the generated PDF file
      });
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("An error occurred while generating the PDF.");
  }
};

const generateUnitsPDF = async (req, res) => {
  try {
    const units = await Units.find(); // Fetch all units

    if (!units || units.length === 0) {
      throw new Error("No units found");
    }

    const doc = new PDFDocument({ margin: 40 });

    // Define the output file path
    const outputDir = `/output/`;
    const filePath = `${outputDir}units.pdf`;

    // Ensure the directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true }); // Create the directory if it doesn't exist
    }

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream); // Pipe the document to the file

    // Title
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Units Details", 40, 100, { align: "center" })
      .moveDown();

    // Table Headers
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Unit Code", 40, 150)
      .text("Description", 120, 150)
      .text("Monthly Fees", 250, 150)
      .moveDown(1);

    // Add each unit data in the table
    let yPosition = 170;
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const unitCode = i + 1; // Unit Code
      const description = unit.type; // Description (assuming `type` is the description)
      const monthlyFee = unit.fee; // Monthly Fee

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(unitCode, 40, yPosition)
        .text(description, 120, yPosition)
        .text(monthlyFee, 250, yPosition);

      yPosition += 20; // Move down for the next row

      // If we're getting close to the end of the page, add a new page
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40; // Reset y-position for the new page
      }
    }

    // Combine data for QR Code (combine the data of all units)
    const qrData = {
      units: units.map((unit) => ({
        unitCode: unit._id, // Unique identifier for each unit
        description: unit.type, // Description
        monthlyFee: unit.fee, // Monthly Fee
      })),
    };

    // Generate a single QR Code for all units combined
    const qrCodePath = `${outputDir}combined-qr.png`;
    await QRCode.toFile(qrCodePath, JSON.stringify(qrData)); // Save the combined QR code to file

    // Add text before QR code and center the QR code
    let qrYPosition = yPosition + 20; // Adjust QR code placement after table

    // Centered QR code
    const qrSize = 150; // Define the size of the QR code
    const qrX = (doc.page.width - qrSize) / 2; // Center horizontally

    doc.image(qrCodePath, qrX, qrYPosition, { width: qrSize, height: qrSize }); // Position QR code

    doc.end(); // Finalize the PDF

    // Send the file for download
    writeStream.on("finish", () => {
      res.download(filePath, `units.pdf`, (err) => {
        if (err) {
          console.error("Error sending PDF:", err);
        }
        // Clean up the generated PDF file
        fs.unlinkSync(filePath);
      });
    });

    // Clean up the QR code file after use
    fs.unlinkSync(qrCodePath);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("An error occurred while generating the PDF.");
  }
};

const generateOwnersPDF = async (req, res) => {
  try {
    const owners = await Owner.find().populate("categoryId", "name"); // Fetch all owners and populate category name

    if (!owners || owners.length === 0) {
      throw new Error("No owners found");
    }

    const doc = new PDFDocument({ margin: 40 });

    // Define the output file path
    const outputDir = `/output/`;
    const filePath = `${outputDir}owners.pdf`;

    // Ensure the directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true }); // Create the directory if it doesn't exist
    }

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream); // Pipe the document to the file

    // Title
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Owners Details", 40, 100, { align: "center" })
      .moveDown();

    // Table Headers
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Name", 20, 150)
      .text("Address", 140, 150)
      .text("Phone", 250, 150)
      .text("Email", 350, 150)
      .text("Unit", 470, 150)
      .moveDown(1);

    // Add each owner data in the table
    let yPosition = 170;
    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];
      const name = owner.name; // Owner's name
      const address = owner.address; // Owner's address
      const phone = owner.phone; // Owner's phone
      const email = owner.email; // Owner's email
      const unit = owner.unit; // Unit

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(name, 20, yPosition)
        .text(address, 140, yPosition)
        .text(phone, 250, yPosition)
        .text(email, 350, yPosition)
        .text(unit, 470, yPosition);

      yPosition += 20; // Move down for the next row

      // If we're getting close to the end of the page, add a new page
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40; // Reset y-position for the new page
      }
    }

    // Combine data for QR Code (combine the data of all owners)
    const qrData = {
      owners: owners.map((owner) => ({
        name: owner.name,
        address: owner.address,
        phone: owner.phone,
        email: owner.email,
        unit: owner.unit,
      })),
    };

    // Generate a single QR Code for all owners combined
    const qrCodePath = `${outputDir}combined-qr.png`;
    await QRCode.toFile(qrCodePath, JSON.stringify(qrData)); // Save the combined QR code to file

    // Add text before QR code and center the QR code
    let qrYPosition = yPosition + 20; // Adjust QR code placement after table

    // Centered QR code
    const qrSize = 150; // Define the size of the QR code
    const qrX = (doc.page.width - qrSize) / 2; // Center horizontally

    doc.image(qrCodePath, qrX, qrYPosition, { width: qrSize, height: qrSize }); // Position QR code

    doc.end(); // Finalize the PDF

    // Send the file for download
    writeStream.on("finish", () => {
      res.download(filePath, `owners.pdf`, (err) => {
        if (err) {
          console.error("Error sending PDF:", err);
        }
        // Clean up the generated PDF file
        fs.unlinkSync(filePath);
      });
    });

    // Clean up the QR code file after use
    fs.unlinkSync(qrCodePath);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("An error occurred while generating the PDF.");
  }
};

router.get("/generate-pdf", async (req, res) => {
  const { categoryId, month } = req.query;
  console.log(month);

  if (!categoryId || !month) {
    return res
      .status(400)
      .send("Missing required parameters: categoryId, month");
  }

  try {
    // Get the current year
    const currentYear = new Date().getFullYear(); // You can modify this if you want to fetch a specific year (e.g., 2025)
    
    // Query Income document for the specified category and year
    const incomeRecords = await Income.find({
      categoryId: categoryId,
      createdAt: {
        $gte: new Date(`${currentYear}-01-01T00:00:00Z`), // Start of the year
        $lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`), // Start of the next year
      },
    });

    // Prepare the data for the PDF
    let tableData = [];
    let totalPaid = 0;
    let totalRemaining = 0;

    incomeRecords.forEach((record, index) => {
      const monthPaid = record.months[month] || 0; // Default to 0 if the month data is missing
      const totalAmount = record.contribution;
      const remainingAmount = totalAmount - monthPaid;
      totalPaid += monthPaid;
      totalRemaining += remainingAmount;

      // Prepare data for the table
      tableData.push({
        srNo: index + 1,
        ownerName: record.ownerName,
        monthPaid,
        remainingAmount,
      });
    });

    // Generate the PDF document
    const doc = new PDFDocument();
    const filename = `payment_details_${month}_${currentYear}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res); // Pipe the PDF document to the response

    doc
      .fontSize(18)
      .text(`Payment Details for ${month} ${currentYear}`, 40, 100, { align: "center" });

    // Table Headers
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Sr No.", 20, 150)
      .text("Owner Name", 140, 150)
      .text("Rent Paid", 250, 150)
      .text("Rent Remaining", 350, 150)
      .moveDown(1);

    // Add each row of data
    let yPosition = 170;
    tableData.forEach((row) => {
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(row.srNo.toString(), 20, yPosition)
        .text(row.ownerName, 140, yPosition)
        .text(row.monthPaid.toString(), 250, yPosition)
        .text(row.remainingAmount.toString(), 350, yPosition);

      yPosition += 20; // Move down for the next row

      // If we are getting close to the end of the page, add a new page
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40; // Reset y-position for the new page
      }
    });

    doc.moveDown(2);
    doc.fontSize(12)
       .font("Helvetica-Bold")
       .text(`Total Paid: ${totalPaid}`, 20, yPosition); // Left aligned
    doc.text(`Total Remaining: ${totalRemaining}`, 20, yPosition + 20); // Left aligned

    // Finalize the PDF and send it to the client
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    return res.status(500).send("Error generating PDF");
  }
});

router.get("/generate-pdf-owner", async (req, res) => {
  const { categoryId, ownerId } = req.query;

  if (!categoryId || !ownerId) {
    return res
      .status(400)
      .send("Missing required parameters: categoryId, ownerId");
  }

  try {
    // Get the current year
    const currentYear = new Date().getFullYear();

    // Query Income document for the specified category, owner, and year
    const incomeRecords = await Income.find({
      categoryId: categoryId,
      _id: ownerId, // Filter by the specified owner ID
      createdAt: {
        $gte: new Date(`${currentYear}-01-01T00:00:00Z`), // Start of the year
        $lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`), // Start of the next year
      },
    });

    // Prepare the data for the PDF
    let tableData = [];
    let totalPaid = 0;
    let totalRemaining = 0;

    incomeRecords.forEach((record, index) => {
      const totalAmount = record.contribution;

      // Loop through each month and get the payment details for that month
      Object.entries(record.months).forEach(([month, paidAmount]) => {
        const remainingAmount = totalAmount - paidAmount;
        totalPaid += paidAmount;
        totalRemaining += remainingAmount;

        // Add the month-wise data to the table
        tableData.push({
          srNo: index + 1,
          month,
          paidAmount,
          remainingAmount,
        });
      });
    });

    // Generate the PDF document
    const doc = new PDFDocument();
    const filename = `payment_details_${currentYear}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res); // Pipe the PDF document to the response

    // Add Header with Owner Name
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(`Payment Details for ${incomeRecords[0]?.ownerName}`, { align: "center" })
      .moveDown(0.5); // Add space after title

    // Add Year heading
    doc
      .fontSize(16)
      .font("Helvetica")
      .text(`Year: ${currentYear}`, { align: "center" })
      .moveDown(1); // Add space after year

    // Table Header
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Sr No.", 20, 150)
      .text("Month", 120, 150)
      .text("Amount Paid", 250, 150)
      .text("Remaining Amount", 380, 150)
      .moveDown(1);

    // Table Borders
    const tableStartY = 170;
    const rowHeight = 20;
    let yPosition = tableStartY;

    // Add each row of data (month-wise)
    tableData.forEach((row, index) => {
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(row.srNo.toString(), 20, yPosition)
        .text(row.month, 120, yPosition)
        .text(row.paidAmount.toFixed(2), 250, yPosition)
        .text(row.remainingAmount.toFixed(2), 380, yPosition);

      yPosition += rowHeight; // Move down for the next row

      // Add a new page if necessary
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40; // Reset y-position for the new page
      }
    });

    // Add Total Section
    doc.moveDown(1);
    doc.fontSize(12).font("Helvetica-Bold").text(`Total Paid: ${totalPaid.toFixed(2)}`, 20, yPosition);
    doc.text(`Total Remaining: ${totalRemaining.toFixed(2)}`, 20, yPosition + 20);

    // Finalize the PDF and send it to the client
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    return res.status(500).send("Error generating PDF");
  }
});





router.get("/propertyinformation", generatePropertyPDF);
router.get("/commiti", generatePropertyPDFcommiti);
router.get("/units", generateUnitsPDF);
router.get("/owner", generateOwnersPDF);

module.exports = router;
