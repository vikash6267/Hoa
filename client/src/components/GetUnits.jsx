import React from "react";
import { FaTrash } from "react-icons/fa"; // Import Trash Icon

const GetUnits = ({ propertyData, loading, onDelete }) => {
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
        Units Information
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {/* <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Code
              </th> */}
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Unit Type
              </th>
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Regular Monthly Fees
              </th>
              {/* <th className="px-4 py-2 text-left text-gray-600 font-semibold">
              Currency
              </th> */}
          
            </tr>
          </thead>
          <tbody>
            {propertyData.map((property, index) => (
              <tr
                key={property._id}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                {/* <td className="px-4 py-2 text-gray-800">{property?.unitCode }</td> */}
                <td className="px-4 py-2 text-gray-800">
                  {property?.type || "N/A"}
                </td>
                <td className="px-4 py-2 text-gray-800">
                  {property?.fee || "N/A"}
                </td>
                {/* <td className="px-4 py-2 text-gray-800">
                  {property?.currency || "N/A"}
                </td> */}
               
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GetUnits;
