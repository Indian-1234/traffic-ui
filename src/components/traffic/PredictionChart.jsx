import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, addHours } from 'date-fns';

const PredictionChart = ({ data }) => {
  const formattedData = data?.map((item, index) => ({
    ...item,
    time: format(addHours(new Date(), index), 'HH:mm'),
    prediction: Number(item.prediction).toFixed(2)
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Traffic Predictions</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="prediction" 
              stroke="#8884d8" 
              fill="#8884d8" 
              fillOpacity={0.3} 
              name="Predicted Traffic"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PredictionChart;