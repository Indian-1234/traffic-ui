import api from './api';

export const trafficService = {
  async getCurrentTraffic(lat = 37.7749, lon = -122.4194) {
    const response = await api.get('/api/traffic/current', {
      params: { lat, lon }
    });
    return response.data;
  },

  async getPredictions(data) {
    const response = await api.post('/api/traffic/predict', data);
    return response.data;
  },

  async getTrafficHistory(lat, lon, days = 7) {
    const response = await api.get('/api/traffic/history', {
      params: { lat, lon, days }
    });
    return response.data;
  }
};