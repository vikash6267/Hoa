import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  handleCreateUnitsAPi,
  getAllUnitsApi,
  deleteUnitsApi,
} from "../services/operation/function";
import GetUnits from "../components/GetUnits";
import axios from "axios";

const UnitsReport = () => {
  const [type, setType] = useState("");
  const [fee, setFee] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [propertyData, setPropertyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("USD"); // Currency state


  const { id } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const propertyData = {
      type,
      fee,
      categoryId: id,
      currency
    };

    const success = await handleCreateUnitsAPi(propertyData);

    if (success) {
      setType("");
      setFee("");

      setShowForm(false);
      fetchUnits();
    }
  };

  const fetchUnits = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getAllUnitsApi(id);
      setPropertyData(data);
    } catch (error) {
      console.error("Error fetching property information:", error);
    } finally {
      setLoading(false);
    }
  };

  // Delete Property
  const handleDelete = async (propertyId) => {
    const confirmed = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this property? This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (confirmed.isConfirmed) {
      const success = await deleteUnitsApi(propertyId);
      if (success) {
        fetchUnits();
      }
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [id]);


  const handleDownloadUnits = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/print/units/${id}`, {
        responseType: "blob", // Important for handling binary data
      });

      // Create a Blob from the response data
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Create a temporary link and simulate a click
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Unit_Report.pdf`); // Set filename
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading the PDF:", error);
      alert("Failed to download PDF.");
    }
  };
  return (
    <div className="p-6 min-h-screen">
      <div className="property-page flex flex-col items-center mb-6">
        <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
          <button onClick={() => navigate("/")} className="button-85">
            Go to Home
          </button>
    
          <button onClick={handleDownloadUnits} className="button-85">
            Print Units
          </button>
        </div>

      </div>

      <GetUnits
        propertyData={propertyData}
        loading={loading}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default UnitsReport;
