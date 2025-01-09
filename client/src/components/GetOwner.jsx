import React from "react";
import { FaTrash } from "react-icons/fa"; // Import Trash Icon

const GetOwner = ({ propertyData, loading, onDelete }) => {
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

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Ownership Title
              </th>
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Name
              </th>
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Address
              </th>
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Phone
              </th>
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Email
              </th>
              <th className="px-4 py-2 text-left text-gray-600 font-semibold">
                Unit
              </th>
              <th className="px-4 py-2 text-center text-gray-600 font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {propertyData.map((property, index) => (
              <tr
                key={property._id}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="px-4 py-2 text-gray-800">{property?.ownershipTitle}</td>
                <td className="px-4 py-2 text-gray-800">
                  {property?.name || "N/A"}
                </td>
                <td className="px-4 py-2 text-gray-800">
                  {property?.address || "N/A"}
                </td>
                <td className="px-4 py-2 text-gray-800">
                  {property?.phone || "N/A"}
                </td>
                <td className="px-4 py-2 text-gray-800">
                  {property?.email || "N/A"}
                </td>
                <td className="px-4 py-2 text-gray-800">
                  {property?.unit || "N/A"}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => onDelete(property._id)}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 focus:outline-none"
                    title="Delete Property"
                  >
                    <FaTrash size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GetOwner;
