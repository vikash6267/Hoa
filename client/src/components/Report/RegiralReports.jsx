import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAllIncomeApi, getAllOutcomeApi } from "../../services/operation/function";

const ReguralReport = ({ type }) => {
  const [filteredData, setFilteredData] = useState([]);

  const [loading, setLoading] = useState(true);

  const { id } = useParams();

  // /BalanceStatement
  const [outCome, setOutComeState] = useState([]);
  const [income, setIncomeState] = useState([]);

  // Fetch income data
  const fetchIncome = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getAllIncomeApi(id);
      console.log(data[0]?.updateLog);
      setIncomeState(data[0]?.updateLog || []);
   
    } catch (error) {
      console.error("Error fetching income data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch outcome data
  const fetchOutcome = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await getAllOutcomeApi(id);
      console.log(data);
      setOutComeState(data[0]?.updateLog || []);
    } catch (error) {
      console.error("Error fetching outcome data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{
    fetchIncome()
    fetchOutcome()
  },[])
  useEffect(() => {
    // Filter data based on the type
    const filterDataByType = () => {
      if (type === "income") {
        return income.map((item) => ({
          ...item,
          type: "income",
          time: new Date(item.date).getTime(),
          amount: parseFloat(Object.values(item.updatedFields)[0]) || 0,
        }));
      } else if (type === "outcome") {
        return outCome.map((item) => ({
          ...item,
          type: "outcome",
          time: new Date(item.date).getTime(),
          amount: parseFloat(Object.values(item.updatedFields)[0]) || 0,
        }));
      }
      return [];
    };

    setFilteredData(filterDataByType());
  }, [income, outCome, type]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">
        {type === "income" ? "Income Statement" : "Outcome Statement"}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-200 p-2">Time</th>
              <th className="border border-gray-200 p-2">Operation</th>
              <th className="border border-gray-200 p-2">Amount</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {filteredData.map((entry, index) => {
              const color =
                entry.type === "income" ? "text-green-500" : "text-red-500";
              const sign = entry.type === "income" ? "+" : "-";

              return (
                <tr key={index}>
                  <td className="border border-gray-200 p-2">
                    {new Date(entry.date).toLocaleString()}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {entry?.operation}
                  </td>
                  <td className={`border border-gray-200 p-2 ${color}`}>
                    {sign} ₹{entry.amount.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReguralReport;