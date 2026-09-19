/* global axios */
import ApiClient from './ApiClient';

class DealsApi extends ApiClient {
  constructor() {
    super('deals', { accountScoped: true });
  }

  getDeals({ contactId, status, userId } = {}) {
    const params = {};
    if (contactId) params.contact_id = contactId;
    if (status) params.status = status;
    if (userId) params.user_id = userId;
    return axios.get(this.url, { params });
  }

  createDeal(data) {
    return axios.post(this.url, { deal: data });
  }

  updateDeal(id, data) {
    return axios.patch(`${this.url}/${id}`, { deal: data });
  }

  deleteDeal(id) {
    return axios.delete(`${this.url}/${id}`);
  }
}

export default new DealsApi();
