<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'dashboard/composables/store';
import { useRouter } from 'vue-router';
import { useAccount } from 'dashboard/composables/useAccount';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Spinner from 'dashboard/components-next/spinner/Spinner.vue';
import CreateDealModal from './CreateDealModal.vue';
import { KanbanConfigHelper } from '../../../kanban/helpers/kanbanConfig';

const props = defineProps({
  contactId: {
    type: [Number, String],
    required: true,
  },
  conversationId: {
    type: [Number, String],
    default: null,
  },
});

const store = useStore();
const router = useRouter();
const { accountId } = useAccount();

const showModal = ref(false);
const editingDeal = ref(null);
const fullConfig = ref({ pipelines: [] });

const deals = computed(() => {
  return store.getters['deals/getDealsByContactId'](props.contactId) || [];
});

const isFetching = computed(() => {
  return store.getters['deals/getUIFlags']?.isFetching || false;
});

const loadData = async () => {
  if (!props.contactId) return;
  try {
    const { config } = await KanbanConfigHelper.loadConfig(store);
    fullConfig.value = config;
    await store.dispatch('deals/fetchDeals', { contact_id: props.contactId });
  } catch (err) {
    // Handle fetch error
  }
};

onMounted(() => {
  loadData();
});

watch(
  () => props.contactId,
  newContactId => {
    if (newContactId) {
      loadData();
    }
  }
);

const getStageName = (pipelineId, stageId) => {
  const pipeline = fullConfig.value.pipelines?.find(
    p => String(p.id) === String(pipelineId)
  );
  if (!pipeline) return stageId;
  const stage = pipeline.stages?.find(s => String(s.id) === String(stageId));
  return stage ? stage.name : stageId;
};

const openCreateModal = () => {
  editingDeal.value = null;
  showModal.value = true;
};

const openEditModal = deal => {
  editingDeal.value = deal;
  showModal.value = true;
};

const goToKanban = deal => {
  router.push({
    name: 'kanban_dashboard',
    params: { accountId: accountId.value },
    query: {
      pipeline_id: deal.pipeline_id,
      deal_id: deal.id,
    },
  });
};
</script>

<template>
  <div class="flex flex-col gap-3 py-2">
    <!-- Header with Add Deal Button -->
    <div class="flex items-center justify-between px-1">
      <span class="text-xs font-medium text-n-slate-11 uppercase tracking-wider">
        Negócios do Contato ({{ deals.length }})
      </span>
      <button
        class="flex items-center gap-1 text-xs font-semibold text-n-brand-10 hover:text-n-brand-11 transition-colors"
        @click="openCreateModal"
      >
        <span>+ Criar Negócio</span>
      </button>
    </div>

    <!-- Spinner Loading State -->
    <div v-if="isFetching && deals.length === 0" class="flex items-center justify-center p-4">
      <Spinner size="small" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="deals.length === 0"
      class="flex flex-col items-center justify-center p-4 text-center rounded-lg border border-dashed border-n-slate-4 bg-n-slate-1"
    >
      <span class="text-xs text-n-slate-10 mb-2">
        Nenhum negócio criado para este contato.
      </span>
      <Button size="small" transparent blue @click="openCreateModal">
        + Criar primeiro negócio
      </Button>
    </div>

    <!-- Deals List -->
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="deal in deals"
        :key="deal.id"
        class="group flex flex-col p-3 rounded-lg border border-n-slate-4 bg-n-slate-2 hover:border-n-brand-6 transition-all"
      >
        <div class="flex items-start justify-between gap-2 mb-1">
          <span
            class="text-sm font-semibold text-n-slate-12 line-clamp-1 cursor-pointer hover:text-n-brand-11"
            @click="openEditModal(deal)"
          >
            {{ deal.title }}
          </span>
          <button
            class="p-1 text-n-slate-10 hover:text-n-brand-10 rounded transition-colors"
            title="Ver no Kanban"
            @click.stop="goToKanban(deal)"
          >
            <Icon icon="i-lucide-kanban" class="w-4 h-4" />
          </button>
        </div>

        <div class="flex items-center justify-between mt-1 text-xs">
          <span class="font-bold text-n-emerald-10">
            {{ deal.formatted_value || 'R$ 0,00' }}
          </span>
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-n-brand-2 text-n-brand-11 border border-n-brand-4"
          >
            {{ getStageName(deal.pipeline_id, deal.stage_id) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <CreateDealModal
      :show="showModal"
      :contact-id="contactId"
      :conversation-id="conversationId"
      :deal="editingDeal"
      @close="showModal = false"
      @saved="loadData"
    />
  </div>
</template>
