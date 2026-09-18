import DealsAPI from 'dashboard/api/deals';

export default {
  namespaced: true,
  state: () => ({
    deals: [],
    uiFlags: {
      isFetching: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
    },
  }),
  getters: {
    getAllDeals: state => state.deals,
    getDealsByContactId: state => contactId => {
      if (!contactId) return [];
      return state.deals.filter(
        d => Number(d.contact_id) === Number(contactId)
      );
    },
    getDealsByPipeline: state => pipelineId => {
      if (!pipelineId) return state.deals;
      return state.deals.filter(
        d => String(d.pipeline_id) === String(pipelineId)
      );
    },
    getDealsByStage: state => stageId => {
      if (!stageId) return [];
      return state.deals.filter(d => String(d.stage_id) === String(stageId));
    },
    getDealById: state => id => {
      return state.deals.find(d => Number(d.id) === Number(id));
    },
    getUIFlags: state => state.uiFlags,
  },
  mutations: {
    SET_UI_FLAGS(state, flags) {
      state.uiFlags = { ...state.uiFlags, ...flags };
    },
    SET_DEALS(state, deals) {
      state.deals = deals || [];
    },
    ADD_DEAL(state, deal) {
      const exists = state.deals.some(d => Number(d.id) === Number(deal.id));
      if (!exists) {
        state.deals = [deal, ...state.deals];
      } else {
        state.deals = state.deals.map(d =>
          Number(d.id) === Number(deal.id) ? deal : d
        );
      }
    },
    UPDATE_DEAL(state, deal) {
      state.deals = state.deals.map(d =>
        Number(d.id) === Number(deal.id) ? { ...d, ...deal } : d
      );
    },
    DELETE_DEAL(state, dealId) {
      state.deals = state.deals.filter(d => Number(d.id) !== Number(dealId));
    },
  },
  actions: {
    async fetchDeals({ commit }, params = {}) {
      commit('SET_UI_FLAGS', { isFetching: true });
      try {
        const response = await DealsAPI.getDeals(params);
        commit('SET_DEALS', response.data);
        return response.data;
      } finally {
        commit('SET_UI_FLAGS', { isFetching: false });
      }
    },
    async createDeal({ commit }, dealData) {
      commit('SET_UI_FLAGS', { isCreating: true });
      try {
        const response = await DealsAPI.createDeal(dealData);
        commit('ADD_DEAL', response.data);
        return response.data;
      } finally {
        commit('SET_UI_FLAGS', { isCreating: false });
      }
    },
    async updateDeal({ commit }, { id, ...data }) {
      commit('SET_UI_FLAGS', { isUpdating: true });
      try {
        const response = await DealsAPI.updateDeal(id, data);
        commit('UPDATE_DEAL', response.data);
        return response.data;
      } finally {
        commit('SET_UI_FLAGS', { isUpdating: false });
      }
    },
    async deleteDeal({ commit }, id) {
      commit('SET_UI_FLAGS', { isDeleting: true });
      try {
        await DealsAPI.deleteDeal(id);
        commit('DELETE_DEAL', id);
      } finally {
        commit('SET_UI_FLAGS', { isDeleting: false });
      }
    },
  },
};
