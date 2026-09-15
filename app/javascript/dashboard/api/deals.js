/* global axios */
import ApiClient from './ApiClient';

class DealsAPI extends ApiClient {
  constructor() {
    super('deals', { accountScoped: true });
  }

  getDeals(params) {
    return axios.get(this.url, { params });
  }

  getDeal(id) {
    return axios.get(`${this.url}/${id}`);
  }

  createDeal(data) {
    return axios.post(this.url, data);
  }

  updateDeal(id, data) {
    return axios.patch(`${this.url}/${id}`, data);
  }

  deleteDeal(id) {
    return axios.delete(`${this.url}/${id}`);
  }
}

export default new DealsAPI();
