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

      doc.text(`Home Owners Association Management System \nwww.hoam.com`, {
        align: "center",
      });
      // Add rounded logo (centered at the top of the page)
      if (logoBuffer) {
        const logoSize = 80; // Size of the logo
        const x = (doc.page.width - logoSize) / 2; // Center the logo horizontally
        const y = 90; // Position from the top
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
        .text(`Property Details: ${property.pName}`, 40, 230, {
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
      const qrSize = 50; // Define the size of the QR code

      // Calculate the position to center the QR code horizontally
      const qrX = (doc.page.width - qrSize) / 2; // Center horizontally

      // Embed QR Code in the PDF (centered horizontally only)
      doc
        .text("Scan the QR Code below to view details:", { align: "center" })
        .image(qrCodePath, qrX, 410, { width: qrSize, height: qrSize }); // Position QR code

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
    doc.text(`Home Owners Association Management System \nwww.hoam.com`, {
      align: "center",
    });
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
    const qrSize = 80; // Define the size of the QR code
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
    doc.text(`Home Owners Association Management System \nwww.hoam.com`, {
      align: "center",
    });
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
    const qrSize = 80; // Define the size of the QR code
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
    const { id } = req.params;
    console.log(id);
    let owners = [];
    if (id) {
      owners = await Owner.find({ categoryId: id }).populate(
        "categoryId",
        "name"
      );
    } else {
      owners = await Owner.find().populate("categoryId", "name");
    }

    const propertyInfo = await PropertyInformations.findOne({ categoryId: id });

    if (!owners || owners.length === 0) {
      throw new Error("No owners found");
    }

    const doc = new PDFDocument({ margin: 40 });
    const outputDir = `/output/`;
    const filePath = `${outputDir}owners.pdf`;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    let logoBuffer = null;

    // Header: System Name and URL
    doc
      .fontSize(6)
      .font("Helvetica-Bold")
      .text("Home Owners Association Management System", { align: "center" })
      .text("www.hoam.com", { align: "center" })
      .moveDown(2);

    let yPosition = doc.y; // Set initial Y position
    yPosition += 20; // Adjust this value to control the distance between header and logo
    console.log(propertyInfo);
    // Add Property Logo
    if (propertyInfo.logo && propertyInfo.logo.url) {
      if (propertyInfo.logo.url.startsWith("http")) {
        const response = await axios.get(propertyInfo.logo.url, {
          responseType: "arraybuffer",
        });
        logoBuffer = Buffer.from(response.data, "binary");
      } else {
        logoBuffer = fs.readFileSync(propertyInfo.logo.url); // Local image
      }

      // Center the logo and adjust y-position
      doc.image(logoBuffer, (doc.page.width - 100) / 2, yPosition, {
        width: 100,
      });
      yPosition += 120; // Adjust Y-position after logo (height of the logo + some space)
    }

    // Add Property Name (below the logo)
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(propertyInfo.pName || "Property Name", { align: "center" })
      .moveDown(3); // Add space after the property name

    // Define column widths for 6 columns (Sr. No., Name, Address, Phone, Email, Unit)
    const columnWidths = [35, 98, 98, 98, 98, 98]; // 6 columns, adjust width as needed
    const headers = ["Sr.", "Name", "Address", "Phone", "Email", "Unit"];

    // Table header (6 columns)
    let xPosition = 20;
    doc.fontSize(12).font("Helvetica-Bold");
    headers.forEach((header, i) => {
      doc.text(header, xPosition, yPosition, {
        width: columnWidths[i],
        align: "center",
      });
      xPosition += columnWidths[i] + 10;
    });

    yPosition += 20; // Move yPosition down after the header

    doc.fontSize(10).font("Helvetica");

    // Table data (6 columns per row)
    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];
      const data = [
        i + 1,
        owner.name,
        owner.address,
        owner.phone,
        owner.email,
        owner.unit,
      ]; // Add Sr. No. here

      // Create new row for each 6 items (one row has 6 columns)
      xPosition = 20;
      data.forEach((item, idx) => {
        doc.text(item || "N/A", xPosition, yPosition, {
          width: columnWidths[idx],
          align: "center",
          lineBreak: true,
        });
        xPosition += columnWidths[idx] + 10;
      });

      // Move to next row (after 6 columns)
      yPosition += 30;

      // Add a new page if the current one is full
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40; // Reset Y position for new page
      }
    }

    // QR Code generation
    const qrData = {
      owners: owners.map((owner) => ({
        name: owner.name,
        address: owner.address,
        phone: owner.phone,
        email: owner.email,
        unit: owner.unit,
      })),
    };

    const qrCodePath = `${outputDir}combined-qr.png`;
    await QRCode.toFile(qrCodePath, JSON.stringify(qrData));

    const qrSize = 80;
    const qrX = (doc.page.width - qrSize) / 2;
    const qrYPosition = yPosition + 20;

    doc.image(qrCodePath, qrX, qrYPosition, { width: qrSize, height: qrSize });

    doc.end();

    writeStream.on("finish", () => {
      res.download(filePath, "owners.pdf", (err) => {
        if (err) {
          console.error("Error sending PDF:", err);
        }
        fs.unlinkSync(filePath);
      });
    });

    fs.unlinkSync(qrCodePath);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("An error occurred while generating the PDF.");
  }
};

const generatePropertyPDFId = async (req, res) => {
  const { id } = req.params;
  try {
    const properties = await PropertyInformations.find({
      categoryId: id,
    }).populate("categoryId"); // Fetch all properties

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

      doc
        .fontSize(6)
        .font("Helvetica-Bold")
        .text("Home Owners Association Management System", { align: "center" })
        .text("www.hoam.com", { align: "center" })
        .moveDown(2);

      // Add rounded logo (centered at the top of the page)
      if (logoBuffer) {
        const logoSize = 50; // Size of the logo
        const x = (doc.page.width - logoSize) / 2; // Center the logo horizontally
        const y = 78; // Position from the top
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
        .text(`Property Name        : ${property.pName}`)
        .text(`Property Address    : ${property.pAddress}`)
        .text(`Ownership Title       : ${property.ownerTitle}`)
        .text(`Number of Units      : ${property.numberOfunits}`)
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
      const qrSize = 80; // Define the size of the QR code

      // Calculate the position to center the QR code horizontally
      const qrX = (doc.page.width - qrSize) / 2; // Center horizontally

      // Embed QR Code in the PDF (centered horizontally only)
      doc
        .text("Scan the QR Code below to view details:", { align: "center" })
        .image(qrCodePath, qrX, 290, { width: qrSize, height: qrSize }); // Position QR code

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

const generatePropertyPDFcommitiId = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch all property committee data
    const propertyCommittees = await PropertyCommiti.find({
      categoryId: id,
    }).populate("categoryId");

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
    doc.text(`Home Owners Association Management System \nwww.hoam.com`, {
      align: "center",
    });
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
    const qrSize = 80; // Define the size of the QR code
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

const generateUnitsPDFId = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch data
    const units = await Units.find({ categoryId: id });
    const ownersDetails = await Owner.find({ categoryId: id });
    const propertyInfo = await PropertyInformations.findOne({ categoryId: id });

    if (!units || units.length === 0 || !propertyInfo) {
      throw new Error("Required data not found");
    }

    const doc = new PDFDocument({ margin: 40 });

    // Output file path
    const outputDir = `/output/`;
    const filePath = `${outputDir}units.pdf`;

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    let logoBuffer = null;

    // Header: System Name and URL
    doc
      .fontSize(6)
      .font("Helvetica-Bold")
      .text("Home Owners Association Management System", { align: "center" })
      .text("www.hoam.com", { align: "center" })
      .moveDown(2);

    let yPosition = doc.y; // Set initial Y position
    yPosition += 20; // Adjust this value to control the distance between header and logo

    // Add Property LogoyPosition += 20;  // Adjust this value to control the distance between header and logo

    if (propertyInfo.logo && propertyInfo.logo.url) {
      if (propertyInfo.logo.url.startsWith("http")) {
        const response = await axios.get(propertyInfo.logo.url, {
          responseType: "arraybuffer",
        });
        logoBuffer = Buffer.from(response.data, "binary");
      } else {
        logoBuffer = fs.readFileSync(propertyInfo.logo.url); // Local image
      }

      // Center the logo and adjust y-position
      doc.image(logoBuffer, (doc.page.width - 100) / 2, yPosition, {
        width: 100,
      });
      yPosition += 120; // Adjust Y-position after logo (height of the logo + some space)
    }

    // Add Property Name (below the logo)
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(propertyInfo.pName || "Property Name", { align: "center" })
      .moveDown(3); // Add space after the property name

    // Section 1: Unit Details
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Unit Details", 40, yPosition, { align: "center" })
      .moveDown(1);

    yPosition += 25;

    // Table Headers for Unit Details
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Unit Code", 40, yPosition)
      .text("Description", 120, yPosition)
      .text("Monthly Fees", 250, yPosition);

    yPosition += 20;

    for (const unit of units) {
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40; // Reset yPosition
      }

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(unit.unitCode, 40, yPosition)
        .text(unit.type || "N/A", 120, yPosition)
        .text(unit.fee || "N/A", 250, yPosition);

      yPosition += 20;
    }

    // Section 2: Owner Details
    if (yPosition > doc.page.height - 100) {
      doc.addPage();
      yPosition = 40; // Reset yPosition
    }

    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Owner Details", 40, yPosition, { align: "center" });

    yPosition += 25;

    const unitOwnerData = ownersDetails.map((owner) => ({
      unitCode: owner.unitDetails?.unitCode || "N/A",
      ownerName: owner.name || "N/A",
      description: owner.unit || "N/A",
      ownershipTitle: owner.ownershipTitle || "N/A",
    }));

    // Table Headers for Owner Details
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Unit Code", 40, yPosition)
      .text("Description", 120, yPosition)
      .text("Owner", 250, yPosition)
      .text("Ownership Title", 360, yPosition);

    yPosition += 20;

    for (const data of unitOwnerData) {
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40; // Reset yPosition
      }

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(data.unitCode, 40, yPosition)
        .text(data.description, 120, yPosition)
        .text(data.ownerName, 250, yPosition)
        .text(data.ownershipTitle, 360, yPosition);

      yPosition += 20;
    }

    

    // QR Code Generation: Generate a dummy QR Code
    const qrCodeData = "https://www.dummy-url.com";
    const qrCodePath = `${outputDir}qr_code.png`;

    await QRCode.toFile(qrCodePath, qrCodeData, {
      width: 100, // Adjust QR Code size
    });

    // Add QR Code at the bottom
    doc.image(qrCodePath, (doc.page.width - 100) / 2, doc.page.height - 120, {
      width: 100,
    });

    // Clean up by deleting the QR code file after PDF generation
    fs.unlinkSync(qrCodePath);
    doc.end();

    writeStream.on("finish", () => {
      res.download(filePath, `units.pdf`, (err) => {
        if (err) {
          console.error("Error sending PDF:", err);
        }
        fs.unlinkSync(filePath);
      });
    });
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
    const currentYear = new Date().getFullYear();
    const propertyInfo = await PropertyInformations.findOne({
      categoryId: categoryId,
    });

    const incomeRecords = await Income.find({
      categoryId: categoryId,
      createdAt: {
        $gte: new Date(`${currentYear}-01-01T00:00:00Z`),
        $lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`),
      },
    });

    let tableData = [];
    let totalPaid = 0;
    let totalRemaining = 0;
    let paidStatusText = "";  // Store status messages separately
    
    incomeRecords.forEach((record, index) => {
      const paidStatus = record.statuses[month];
      let monthPaid = record.months[month] || 0;
      let monthPaidWithStatus = record.months[month] || 0;
      const totalAmount = record.contribution;
      let remainingAmount = totalAmount - monthPaid;
    
      if (paidStatus === "late paid") {
        paidStatusText += ` ${monthPaid} Late Paid`;
        remainingAmount = 0;
        monthPaidWithStatus = `${monthPaid} Late Paid`
      } else if (paidStatus === "pay in advance") {
        paidStatusText += ` ${monthPaid} Advance Paid`;
        remainingAmount = 0;
        monthPaidWithStatus = `${monthPaid} Advance Paid`

      } 
        totalPaid += monthPaid; // Ensure only numbers are summed
      
    
      totalRemaining += remainingAmount;
    
      tableData.push({
        srNo: index + 1,
        ownerName: record.ownerName,
        monthPaid,
        remainingAmount,
        monthPaidWithStatus,
        contribution: record.contribution,
      });
    });
    
    // Update PDF summary section

    const doc = new PDFDocument();
    const filename = `payment_details_${month}_${currentYear}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res); // Pipe the PDF document to the response
    let logoBuffer = null;

    // Header: System Name and URL
    doc
      .fontSize(6)
      .font("Helvetica-Bold")
      .text("Home Owners Association Management System", { align: "center" })
      .text("www.hoam.com", { align: "center" })
      .moveDown(2);

    let yPosition = doc.y; // Set initial Y position
    yPosition += 20; // Adjust this value to control the distance between header and logo

    // Add Property Logo
    if (propertyInfo.logo && propertyInfo.logo.url) {
      if (propertyInfo.logo.url.startsWith("http")) {
        const response = await axios.get(propertyInfo.logo.url, {
          responseType: "arraybuffer",
        });
        logoBuffer = Buffer.from(response.data, "binary");
      } else {
        logoBuffer = fs.readFileSync(propertyInfo.logo.url); // Local image
      }

      // Center the logo and adjust y-position
      doc.image(logoBuffer, (doc.page.width - 100) / 2, yPosition, {
        width: 100,
      });
      yPosition += 120; // Adjust Y-position after logo (height of the logo + some space)
    }

    // Add Property Name (below the logo)
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(propertyInfo.pName || "Property Name", { align: "center" })
      .moveDown(3); // Add space after the property name

    // Add Payment Details Title
    doc
      .fontSize(18)
      .text(`Payment Details for ${month} ${currentYear}`, 50, yPosition, {
        align: "center",
      });

    yPosition += 40; // Move position down to start the table

    const columnWidths = [35, 105, 105, 105, 105, 105]; // 6 columns, adjust width as needed
    const headers = [
      "Sr.",
      "Owner Name",
      "Contribution",
      "Paid Contribution",
      "Unpaid Contribution",
    ];

    let xPosition = 20;
    doc.fontSize(12).font("Helvetica-Bold");
    headers.forEach((header, i) => {
      doc.text(header, xPosition, yPosition, {
        width: columnWidths[i],
        align: "center",
      });
      xPosition += columnWidths[i] + 10;
    });

    yPosition += 30; // Move yPosition down after the header

    doc.fontSize(10).font("Helvetica");

    for (let i = 0; i < tableData.length; i++) {
      const owner = tableData[i];
      const data = [
        i + 1,
        owner.ownerName,
        owner.contribution.toString(),
        owner.monthPaidWithStatus.toString(),
        owner.remainingAmount.toString(),
      ]; // Add Sr. No. here

      // Create new row for each 6 items (one row has 6 columns)
      xPosition = 20;
      data.forEach((item, idx) => {
        doc.text(item || "N/A", xPosition, yPosition, {
          width: columnWidths[idx],
          align: "center",
          lineBreak: true,
        });
        xPosition += columnWidths[idx] + 10;
      });

      // Move to next row (after 6 columns)
      yPosition += 30;

      // Add a new page if the current one is full
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40; // Reset Y position for new page
      }
    }

    // Total Payment Summary
    doc.moveDown(2);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`Total Paid: ${totalPaid}`, 20, yPosition); // Left aligned
    doc.text(`Total Remaining: ${totalRemaining}`, 20, yPosition + 20); // Left aligned

    // Monthly Contribution Summary
    doc.moveDown(2);
    const monthlyContribution = incomeRecords.reduce(
      (sum, record) => sum + record.contribution,
      0
    );
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(
        `Monthly Contribution for ${month}: ${monthlyContribution}`,
        20,
        yPosition + 40
      );

    // Finalize the PDF and send it to the client

    // QR Code Generation: Generate a dummy QR Code
    const qrCodeData = "https://www.dummy-url.com";
    const qrCodePath = `${month}qr_code.png`;

    await QRCode.toFile(qrCodePath, qrCodeData, {
      width: 100, // Adjust QR Code size
    });

    // Add QR Code at the bottom
    doc.image(qrCodePath, (doc.page.width - 100) / 2, doc.page.height - 120, {
      width: 100,
    });

    // Clean up by deleting the QR code file after PDF generation
    fs.unlinkSync(qrCodePath);
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

  const president = await PropertyCommiti.findOne({ categoryId: categoryId, position: "President" });

  console.log(president)

  
  try {
    // Get the current year
    const currentYear = new Date().getFullYear();
    const propertyInfo = await PropertyInformations.findOne({
      categoryId: categoryId,
    });

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
    let paidStatusText = "";  // Store status messages separately
    
    incomeRecords.forEach((record, index) => {
      const totalAmount = record.contribution;
      
      // Loop through each month and get the payment details for that month
      Object.entries(record.months).forEach(([month, paidAmount]) => {
        const paidStatus = record.statuses[month]

   
        let remainingAmount = totalAmount - paidAmount;
        let monthPaidWithStatus =  paidAmount;
        if (paidStatus === "late paid") {
          paidStatusText += ` ${paidAmount} Late Paid`;
          remainingAmount = 0;
          monthPaidWithStatus = `${paidAmount} Late Paid`
        } else if (paidStatus === "pay in advance") {
          paidStatusText += ` ${paidAmount} Advance Paid`;
          remainingAmount = 0;
          monthPaidWithStatus = `${paidAmount} Advance Paid`
  
        } 
        totalPaid += paidAmount;
        totalRemaining += remainingAmount;

        // Add the month-wise data to the table
        tableData.push({
          srNo: index + 1,
          month,
          paidAmount,
          remainingAmount,
          monthPaidWithStatus,
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
    let logoBuffer = null;

    // Header: System Name and URL
    doc
      .fontSize(6)
      .font("Helvetica-Bold")
      .text("Home Owners Association Management System", { align: "center" })
      .text("www.hoam.com", { align: "center" })
      .moveDown(2);

    let yPosition = doc.y; // Set initial Y position after the header
    yPosition += 20; // Adjust this value to control the distance between header and logo

    // Add Property Logo
    if (propertyInfo.logo && propertyInfo.logo.url) {
      if (propertyInfo.logo.url.startsWith("http")) {
        const response = await axios.get(propertyInfo.logo.url, {
          responseType: "arraybuffer",
        });
        logoBuffer = Buffer.from(response.data, "binary");
      } else {
        logoBuffer = fs.readFileSync(propertyInfo.logo.url); // Local image
      }

      // Center the logo and adjust y-position
      doc.image(logoBuffer, (doc.page.width - 100) / 2, yPosition, {
        width: 100,
      });
      yPosition += 180; // Adjust Y-position after logo (height of the logo + some space)
    }

    // Add Property Name (below the logo)
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(propertyInfo.pName || "Property Name", { align: "center" })
      .moveDown(5); // Add space after the property name

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(`Payment Details for ${incomeRecords[0]?.ownerName}`, {
        align: "center",
      })
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
      .text("Sr No.", 20, yPosition)
      .text("Month", 120, yPosition)
      .text("Amount Paid", 250, yPosition)
      .text("Remaining Amount", 380, yPosition)
      .moveDown(1);

    // Table Borders
    const tableStartY = yPosition + 20; // Start the table below the header
    const rowHeight = 20;
    yPosition = tableStartY;

    let totalPaid1 = 0;
    let totalRemaining2 = 0;

    const currentMonth = new Date().getMonth(); // 0-based (0 = January, 11 = December)

    // Add each row of data (month-wise)
    tableData.forEach((row, index) => {
      const monthIndex = new Date(`${currentYear}-${row.month}-01`).getMonth(); // Convert month name to month index (0-11)
      let paidAmount = row.monthPaidWithStatus;
      let remainingAmount = row.remainingAmount;

      if (monthIndex > currentMonth) {
        // If the month is in the future, set "Not Happened"
        paidAmount = "Not Happened";
        remainingAmount = "Not Happened";
      } else {
        // If the month has passed, accumulate totals
        totalPaid1 += parseFloat(paidAmount) || 0;
        totalRemaining2 += parseFloat(remainingAmount) || 0;
      }
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`${index + 1}`, 20, yPosition)
        .text(row.month, 120, yPosition)
        .text(paidAmount, 250, yPosition)
        .text(remainingAmount, 380, yPosition);

      yPosition += rowHeight; // Move down for the next row

      // Add a new page if necessary
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40; // Reset y-position for the new page
      }
    });

    // Add Total Section
    doc.moveDown(1);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`Total Paid: ${totalPaid1.toFixed(2)}`, 20, yPosition);
    doc.text(
      `Total Remaining: ${totalRemaining2.toFixed(2)}`,
      20,
      yPosition + 20
    );


    const qrData = {
      property: {
        name: propertyInfo.pName,
        address: propertyInfo.pAddress,
        ownershipTitle: propertyInfo.ownerTitle,
        numberOfUnits: propertyInfo.numberOfunits,
      },
    };
    
    const qrCodePath = `${filename}qr-.png`;
    await QRCode.toFile(qrCodePath, JSON.stringify(qrData)); // Save QR code to file
    
    const qrSize = 50; // QR Code Size
    const signatureWidth = 60; // Signature Width
    const gap = 20; // Space between QR & President section
    
    // Calculate X positions for QR and President section
    const totalWidth = qrSize + gap + signatureWidth;
    const startX = (doc.page.width - totalWidth) / 2; // Center both together
    
    const qrX = startX; // QR left side
    const presidentX = startX + qrSize + gap; // President name & signature right side
    
    const qrY = 640; // Y-position for QR
    const textY = 640; // Y-position for President name
    const signatureY = textY + 20; // Signature just below the name
    
    // Embed QR Code in the PDF
    doc.image(qrCodePath, qrX, qrY, { width: qrSize, height: qrSize });
    
    // If president exists, add name & signature
    if (president?.name) {
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text(president.name, presidentX, textY); // President name at right side
    
      if (president?.signature?.url) {
        let signatureBuffer;
        if (president.signature.url.startsWith("http")) {
          const response = await axios.get(president.signature.url, {
            responseType: "arraybuffer",
          });
          signatureBuffer = Buffer.from(response.data, "binary");
        } else {
          signatureBuffer = fs.readFileSync(president.signature.url);
        }
    
        // Signature just below the President's name
        doc.image(signatureBuffer, presidentX, signatureY, { width: signatureWidth });
      }
    }
    
        
    // Finalize the PDF and send it to the client
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    return res.status(500).send("Error generating PDF");
  }
});






router.get("/generate-general-report", async (req, res) => {
  try {
    const { categoryId } = req.query;

    // Get the current year
    const currentYear = new Date().getFullYear();

    // Query Income document for the entire year for all owners
    const incomeRecords = await Income.find({
      categoryId: categoryId,
      createdAt: {
        $gte: new Date(`${currentYear}-01-01T00:00:00Z`), // Start of the year
        $lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`), // Start of the next year
      },
    });

    // Prepare the data for the report
    let tableData = [];
    let totalPaid = 0;
    let totalRemaining = 0;

    // Prepare the table data with amounts for each month
    incomeRecords.forEach((record, index) => {
      let totalPaidByOwner = 0;
      let ownerData = {
        ownerName: record.ownerName,
        monthDetails: [],
      };

      // Loop through each month (January to December)
      Object.keys(record.months).forEach((month) => {
        const monthPaid = record.months[month] || 0; // Get the payment for the month
        const totalAmount = record.contribution;
        const remainingAmount = totalAmount - monthPaid;

        totalPaidByOwner += monthPaid; // Add the paid amount to the total for this owner

        ownerData.monthDetails.push({
          month,
          monthPaid,
          remainingAmount,
        });
      });

      tableData.push(ownerData);
      totalPaid += totalPaidByOwner;
      totalRemaining += record.contribution - totalPaidByOwner;
    });

    // Create a PDF document
    const doc = new PDFDocument();

    // Set PDF headers and styles
    doc.fontSize(18).text("General Report", { align: "center" });
    doc.fontSize(12).text(`Year: ${currentYear}`, { align: "center" });
    doc.moveDown(2);

    // Table Headers
    const headers = [
      "Owner Name",
      "January Paid",
      "January Remaining",
      "February Paid",
      "February Remaining",
      "March Paid",
      "March Remaining",
      "April Paid",
      "April Remaining",
      "May Paid",
      "May Remaining",
      "June Paid",
      "June Remaining",
      "July Paid",
      "July Remaining",
      "August Paid",
      "August Remaining",
      "September Paid",
      "September Remaining",
      "October Paid",
      "October Remaining",
      "November Paid",
      "November Remaining",
      "December Paid",
      "December Remaining",
      "Total Paid",
      "Total Remaining",
    ];

    // Draw table headers
    doc.fontSize(10).text(headers.join(" | "), { align: "center" });
    doc.moveDown(1);

    // Add the data for each owner to the PDF
    tableData.forEach((owner) => {
      const row = [
        owner.ownerName,
        owner.monthDetails[0].monthPaid,
        owner.monthDetails[0].remainingAmount,
        owner.monthDetails[1].monthPaid,
        owner.monthDetails[1].remainingAmount,
        owner.monthDetails[2].monthPaid,
        owner.monthDetails[2].remainingAmount,
        owner.monthDetails[3].monthPaid,
        owner.monthDetails[3].remainingAmount,
        owner.monthDetails[4].monthPaid,
        owner.monthDetails[4].remainingAmount,
        owner.monthDetails[5].monthPaid,
        owner.monthDetails[5].remainingAmount,
        owner.monthDetails[6].monthPaid,
        owner.monthDetails[6].remainingAmount,
        owner.monthDetails[7].monthPaid,
        owner.monthDetails[7].remainingAmount,
        owner.monthDetails[8].monthPaid,
        owner.monthDetails[8].remainingAmount,
        owner.monthDetails[9].monthPaid,
        owner.monthDetails[9].remainingAmount,
        owner.monthDetails[10].monthPaid,
        owner.monthDetails[10].remainingAmount,
        owner.monthDetails[11].monthPaid,
        owner.monthDetails[11].remainingAmount,
        totalPaid,
        totalRemaining,
      ];
      doc.text(row.join(" | "), { align: "center" });
      doc.moveDown(1);
    });

    // Final total row
    doc.moveDown(1).text(`Total Paid: ${totalPaid}`, { align: "right" });
    doc.text(`Total Remaining: ${totalRemaining}`, { align: "right" });

    // Send the PDF to the response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=general_report.pdf"
    );
    doc.pipe(res); // Stream the PDF directly to the response
    doc.end();
  } catch (error) {
    console.error("Error generating general report:", error);
    return res.status(500).send("Error generating report");
  }
});

router.get("/generate-pdfYear", async (req, res) => {
  const { categoryId } = req.query;

  if (!categoryId) {
    return res.status(400).send("Missing required parameter: categoryId");
  }

  try {
    const propertyInfo = await PropertyInformations.findOne({
      categoryId: categoryId,
    });

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonthIndex = currentDate.getMonth();
    const currentMonth = currentDate.toLocaleString("default", {
      month: "long",
    });

    const monthsList = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const incomeRecords = await Income.find({
      categoryId: categoryId,
      createdAt: {
        $gte: new Date(`${currentYear}-01-01T00:00:00Z`),
        $lt: new Date(`${currentYear + 1}-01-01T00:00:00Z`),
      },
    }).populate("categoryId");

    let tableData = [];
    let totalPaid = 0;
    let totalUnpaid = 0;

    incomeRecords.forEach((record, index) => {
      const totalAmount = record.contribution;
      let totalPaidForMonths = 0;
      let paidStatus = 0;
      let paidWithStatus = 0;
      let remainingAmount = 0;
    
      
      for (let i = 0; i <= currentMonthIndex; i++) {
         paidStatus = record.statuses[monthsList[i]]
        totalPaidForMonths += record.months[monthsList[i]] || 0;
        totalPaid += record.months[monthsList[i]] || 0;
    
        if(paidStatus === "late paid"){
          remainingAmount = 0
          paidWithStatus = `${totalPaidForMonths}  `
          remainingAmount = 0
          totalUnpaid +=  0

        } else if(paidStatus === "pay in advance"){
          remainingAmount = 0
          paidWithStatus = `${totalPaidForMonths}  `
          remainingAmount = 0
          totalUnpaid +=  0

        }else{
          remainingAmount += totalAmount - record.months[monthsList[i]]
          totalUnpaid += totalAmount - record.months[monthsList[i]]

        }
      }
     ;
      // totalPaid += totalPaidForMonths;
      // totalUnpaid += remainingAmount;


    


      tableData.push({
        srNo: index + 1,
        ownerName: record.ownerName,
        amountPaid: totalPaidForMonths,
        remainingAmount,
        paidWithStatus,
        totalAmount
      });
    });

    const doc = new PDFDocument();
    const filename = `payment_details_${currentMonth}_${currentYear}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);

    let logoBuffer = null;

    // Header Text
    doc
      .fontSize(6)
      .font("Helvetica-Bold")
      .text("Home Owners Association Management System", { align: "center" })
      .text("www.hoam.com", { align: "center" })
      .moveDown(2);

    let yPosition = doc.y; // Get the current Y position for the header
    yPosition += 20; // Adjust the y-position after header text

    // Add Property Logo (with better spacing)
    if (propertyInfo.logo && propertyInfo.logo.url) {
      if (propertyInfo.logo.url.startsWith("http")) {
        const response = await axios.get(propertyInfo.logo.url, {
          responseType: "arraybuffer",
        });
        logoBuffer = Buffer.from(response.data, "binary");
      } else {
        logoBuffer = fs.readFileSync(propertyInfo.logo.url); // Local image
      }

      // Center the logo and set Y position
      doc.image(logoBuffer, (doc.page.width - 100) / 2, yPosition, {
        width: 100,
      });
      yPosition += 120; // Add space after the logo
    }

    // Add Property Name (below the logo)
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(propertyInfo.pName || "Property Name", { align: "center" })
      .moveDown(3);

    // Category Name

    // Title: Payment Details
    doc
      .fontSize(18)
      .text(
        `Payment Details for ${currentMonth} ${currentYear}`,
        50,
        yPosition,
        { align: "center" }
      );

    // Table Headers (add some space below the title)
    yPosition += 30; // Adjust for table header spacing
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Sr No.", 20, yPosition)
      .text("Owner Name", 140, yPosition)
      .text("Amount", 250, yPosition)
      .text("Total Paid", 350, yPosition)
      .text("Total Unpaid", 450, yPosition)
      .moveDown(1);

    yPosition += 20; // Adjust yPosition for the rows

    // Add table data
    tableData.forEach((row, index) => {
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 40; // Reset y-position for the new page
      }

      doc
        .fontSize(10)
        .font("Helvetica")
        .text(`${index + 1}`, 20, yPosition)
        .text(row.ownerName, 140, yPosition)
        .text(row.totalAmount.toString(), 250, yPosition)
        .text(row.amountPaid.toString(), 350, yPosition)
        .text(row.remainingAmount.toString(), 450, yPosition);

      yPosition += 20;
    });

    // Total row at the end
    doc.moveDown(2);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`Total Paid: ${totalPaid}`, 20, yPosition);
    doc.text(`Total Unpaid: ${totalUnpaid}`, 20, yPosition + 20);

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    return res.status(500).send("Error generating PDF");
  }
});

router.get("/propertyinformation", generatePropertyPDF);
router.get("/propertyinformation/:id", generatePropertyPDFId);
router.get("/commiti", generatePropertyPDFcommiti);
router.get("/commiti/:id", generatePropertyPDFcommitiId);
router.get("/units", generateUnitsPDF);
router.get("/units/:id", generateUnitsPDFId);
router.get("/owner", generateOwnersPDF);
router.get("/owner/:id", generateOwnersPDF);

module.exports = router;
