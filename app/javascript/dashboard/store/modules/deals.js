import * as MutationHelpers from 'shared/helpers/vuex/mutationHelpers';
import types from '../mutation-types';
import DealsAPI from '../../api/deals';

export const state = {
  records: [],
  uiFlags: {
    isFetching: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  },
};

export const getters = {
  getDeals(_state) {
    return _state.records;
  },
  getActiveDeals(_state) {
    return _state.records.filter(d => d.status === 'open' || d.status === 'in_progress');
  },
  getDealsForContact: _state => contactId => {
    return _state.records.filter(
      d => d.contact_id === Number(contactId) && (d.status === 'open' || d.status === 'in_progress')
    );
  },
  getAllDealsForContact: _state => contactId => {
    return _state.records.filter(d => d.contact_id === Number(contactId));
  },
  getDealById: _state => id => {
    return _state.records.find(d => d.id === Number(id)) || null;
  },
  getUIFlags(_state) {
    return _state.uiFlags;
  },
};

export const actions = {
  async fetchDeals({ commit }, { contactId, status, userId } = {}) {
    commit(types.SET_DEAL_UI_FLAG, { isFetching: true });
    try {
      const response = await DealsAPI.getDeals({ contactId, status, userId });
      commit(types.SET_DEALS, response.data.deals || []);
    } catch (error) {
      // ignore
    } finally {
      commit(types.SET_DEAL_UI_FLAG, { isFetching: false });
    }
  },

  async createDeal({ commit }, dealData) {
    commit(types.SET_DEAL_UI_FLAG, { isCreating: true });
    try {
      const response = await DealsAPI.createDeal(dealData);
      commit(types.ADD_DEAL, response.data);
      return response.data;
    } catch (error) {
      throw error;
    } finally {
      commit(types.SET_DEAL_UI_FLAG, { isCreating: false });
    }
  },

  async updateDeal({ commit }, { id, ...dealData }) {
    commit(types.SET_DEAL_UI_FLAG, { isUpdating: true });
    try {
      const response = await DealsAPI.updateDeal(id, dealData);
      commit(types.EDIT_DEAL, response.data);
      return response.data;
    } catch (error) {
      throw error;
    } finally {
      commit(types.SET_DEAL_UI_FLAG, { isUpdating: false });
    }
  },

  async deleteDeal({ commit }, id) {
    commit(types.SET_DEAL_UI_FLAG, { isDeleting: true });
    try {
      await DealsAPI.deleteDeal(id);
      commit(types.DELETE_DEAL, id);
    } catch (error) {
      throw error;
    } finally {
      commit(types.SET_DEAL_UI_FLAG, { isDeleting: false });
    }
  },
};

export const mutations = {
  [types.SET_DEAL_UI_FLAG](_state, data) {
    _state.uiFlags = { ..._state.uiFlags, ...data };
  },
  [types.SET_DEALS]: MutationHelpers.set,
  [types.ADD_DEAL]: MutationHelpers.create,
  [types.EDIT_DEAL]: MutationHelpers.update,
  [types.DELETE_DEAL]: MutationHelpers.destroy,
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
