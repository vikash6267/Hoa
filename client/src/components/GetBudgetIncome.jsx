import React, { useState, useEffect } from "react";
import { FaTrash, FaEdit } from "react-icons/fa";
import ImageUploaderWithCrop from "./common/ImageUpload";
import { updateBudgetIncomeApi } from "../services/operation/function";
import { MdClose } from "react-icons/md"; // Import React Icon
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import ExpeptionalReports from "./Report/ExpeptionalReports";

const GetBudgetIncome = ({
  propertyData,
  loading,
  onDelete,
  fetchBudgetIncome,
  id,
}) => {
  const [filteredData, setFilteredData] = useState(propertyData);
  const [selectedYear, setSelectedYear] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [imageData, setImageData] = useState({ publicId: "", url: "" }); // State to store only public_id and url
  const [selectedImage, setSelectedImage] = useState(null); // Base64 image data
  const [seletedId, setSeletedId] = useState(null);
  const[change,setChange] = useState(0)

  useEffect(() => {
    const total = filteredData.reduce(
      (sum, property) => sum + (parseInt(property.amount) || 0), // Convert amount to an integer
      0
    );
    setTotalAmount(total);
  }, [filteredData]);

  useEffect(() => {
    // Filter data by year
    if (selectedYear) {
      const filtered = propertyData.filter(
        (property) =>
          new Date(property.createdAt).getFullYear().toString() === selectedYear
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(propertyData);
    }
  }, [selectedYear, propertyData]);

  const editHandle = async (id) => {
    setSeletedId(id);
    console.log(id);

    // Filter the propertyData to find the matching item
    const selectedData = propertyData.find((item) => item._id === id);
    console.log(selectedData);
    if (selectedData) {
      // Set the form fields with the data from the selected item
      setName(selectedData.name);
      setAmount(selectedData.amount);
      setImageData(selectedData.document || null); // If there's a base64 image, set it
      setShowForm(true); // Show the form modal
    } else {
      console.log("Item not found!");
    }
  };

  const handleSubmit = async () => {
    const propertyData = {
      name,
      amount,
      document: imageData,
    };

    const success = await updateBudgetIncomeApi(propertyData, seletedId);

    if (success) {
      setName("");
      setAmount("");
      setShowForm(false);
      fetchBudgetIncome();
      setChange(change + 1)
    }
  };

     const handlePrintPDF = () => {
        const doc = new jsPDF();
        const tableColumns = ["Owner Name", "Contribution", , "Date Time"];
        const tableRows = [];
    
        filteredData.forEach((income) => {
          
          const row = [
            income.name,
            income.amount,
                  `${new Date(income?.createdAt).toLocaleDateString()} ${new Date(income?.createdAt).toLocaleTimeString()}`,

                ];
          tableRows.push(row);
        });
    
        doc.text("Income Information", 14, 10);
        doc.autoTable({
          head: [tableColumns],
          body: tableRows,
          startY: 20,
        });
        doc.save("income-information.pdf");
      };
    
      // Export as Excel
      const handleExportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(
          filteredData.map((income) => {
           
            return {
              "Owner Name": income.name,
              Contribution: income.amount,
               "Date&Time":                   `${new Date(income?.createdAt).toLocaleDateString()} ${new Date(income?.createdAt).toLocaleTimeString()}`,
                
            };
          })
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Income Data");
        XLSX.writeFile(wb, "income-information.xlsx");
      };
  if (loading) {
    return (
      <p className="text-center text-gray-500 text-lg font-semibold">
        Loading property information...
      </p>
    );
  }

  if (!propertyData || propertyData.length === 0) {
    return (
      <p className="text-center text-red-500 text-lg font-semibold">
        No property information found.
      </p>
    );
  }

  return (
    <div className="property-info-container p-6 min-h-screen">
      <h2 className="text-3xl font-bold text-blue-600 mb-6 text-center">
        Property Information
      </h2>
      <div className=" w-full flex justify-center mb-4">
        <button
          onClick={handlePrintPDF}
          className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
        >
          Print as PDF
        </button>
        <button
          onClick={handleExportExcel}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Export to Excel
        </button>
      </div>
      {/* Filter for Year */}
      <div className="mb-4 flex justify-center">
        <label htmlFor="year" className="mr-2 text-white mt-2">
          Filter by Year:
        </label>
        <select
          id="year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="border px-4 py-2 rounded-md"
        >
          <option value="">All</option>
          {propertyData
            .map((property) => new Date(property.createdAt).getFullYear())
            .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
            .map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
        </select>
      </div>


      {!selectedYear && (
    <div className="flex justify-center items-center mt-5">
      <div className="bg-red-100 text-red-700 border border-red-300 p-4 rounded-lg shadow-lg max-w-md text-center">
        <p className="font-semibold text-lg">Please select a year.</p>
      </div>
    </div>
  )}
 {
  selectedYear &&
  <div>
    <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Code
              </th>
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Owners
              </th>
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Contribution
              </th>
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Date & Time
              </th>

              <th className="px-4 py-2 text-center text-gray-600 font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((property, index) => (
              <tr
                key={property._id}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="px-4 py-2 text-gray-800">{index + 1}</td>
                <td className="px-4 py-2 text-gray-800">
                  {property?.name || "N/A"}
                </td>
                <td className="px-4 py-2 text-gray-800">
                  {property?.amount || "N/A"}
                </td>
                <td className="px-4 py-2 text-gray-800">
                  {new Date(property?.createdAt).toLocaleDateString()}{" "}
                  {new Date(property?.createdAt).toLocaleTimeString()}
                </td>
                <td className="px-4 py-2 text-center">
                  {/* <button
                    onClick={() => onDelete(property._id)}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 focus:outline-none"
                    title="Delete Property"
                  >
                    <FaTrash size={16} />
                  </button> */}
                  <button
                    onClick={() => editHandle(property._id)}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 focus:outline-none"
                    title="Edit Budget"
                  >
                    <FaEdit size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total Amount */}
      <div className="mt-4 text-white text-center  font-semibold">
        <p>Total Amount: ₹{totalAmount}</p>
      </div>
    </div>
 }
{
  selectedYear && 
      <ExpeptionalReports
      type="income" change={change} />
}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="form bg-gray-100 p-6 rounded-lg shadow-md w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <input
              type="text"
              placeholder="Enter Owner Name"
              value={name}
              disabled
              onChange={(e) => setName(e.target.value)}
              className="border p-2 w-full mb-4 rounded-lg"
            />
            <input
              type="number"
              placeholder="Enter Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border p-2 w-full mb-4 rounded-lg"
            />

            <div className="flex justify-center items-center">
              <button onClick={handleSubmit} className="button-85">
                Update Budget Income
              </button>
            </div>

            {/* Close button using React Icon */}
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-2 right-2 text-white hover:text-red-500 bg-red-500 rounded-full"
            >
              <MdClose size={24} />
            </button>
          </div>
        </div>
      )}
    </div>

    
  );
};

export default GetBudgetIncome;
