<script setup>
/* eslint-disable no-console, no-restricted-globals, no-alert */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'dashboard/composables/store';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAlert } from 'dashboard/composables';
import Draggable from 'vuedraggable';

import Icon from 'dashboard/components-next/icon/Icon.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Thumbnail from 'dashboard/components/widgets/Thumbnail.vue';
import Spinner from 'dashboard/components-next/spinner/Spinner.vue';

// Custom Kanban Components
import KanbanCard from './components/KanbanCard.vue';
import PipelineSettingsModal from './components/PipelineSettingsModal.vue';
import CreateDealModal from '../conversation/contact/CreateDealModal.vue';

// Config Storage Helper
import { KanbanConfigHelper } from './helpers/kanbanConfig';

const { t } = useI18n();
const store = useStore();
const router = useRouter();
const route = useRoute();

// State fields
const fullConfig = ref({ pipelines: [] });
const activePipelineId = ref(null);
const configLabelId = ref(null);
const searchQuery = ref('');
const pipelineSearchQuery = ref('');
const filterAgentId = ref('');
const filterStatus = ref('');
const filterPriority = ref('');
const sortBy = ref('newest');
const showSortDropdown = ref(false);
const showSortLabel = ref('Mais recente');

// Modals
const showSettingsModal = ref(false);
const activeEditingPipeline = ref(null);
const showDealModal = ref(false);
const dealModalStageId = ref(null);
const dealModalPipelineId = ref(null);
const dealModalContactId = ref(null);
const dealModalDeal = ref(null);

// Load core Chatwoot resources
const allAgents = computed(() => store.getters['agents/getAgents'] || []);
const allInboxes = computed(() => store.getters['inboxes/getInboxes'] || []);
const allDeals = computed(() => store.getters['deals/getAllDeals'] || []);

// Active pipeline
const activePipeline = computed(() => {
  return (
    fullConfig.value.pipelines.find(p => p.id === activePipelineId.value) ||
    null
  );
});

// Load configs from special Label
const loadKanbanConfig = async () => {
  try {
    const { labelId, config } = await KanbanConfigHelper.loadConfig(store);
    fullConfig.value = config;
    configLabelId.value = labelId;

    const pipelineId = Number(
      route.params.pipelineId || route.query.pipeline_id
    );
    if (pipelineId && config.pipelines.some(p => p.id === pipelineId)) {
      activePipelineId.value = pipelineId;
    } else {
      activePipelineId.value = null;
    }
  } catch (err) {
    console.error('Failed to load Kanban configurations:', err);
  }
};

watch(
  () => route.query.pipeline_id,
  newId => {
    const parsedId = Number(newId);
    if (parsedId && fullConfig.value.pipelines.some(p => p.id === parsedId)) {
      activePipelineId.value = parsedId;
    } else {
      activePipelineId.value = null;
    }
  }
);

// Overview Helper Methods
const selectPipeline = pipeline => {
  router.push({
    name: 'kanban_dashboard',
    query: { pipeline_id: pipeline.id },
  });
};

const getDealsForPipeline = pipeline => {
  if (!pipeline) return [];
  return allDeals.value.filter(
    d => String(d.pipeline_id) === String(pipeline.id)
  );
};

const getStageLeadsCount = (stage, pipeline) => {
  return getDealsForPipeline(pipeline).filter(
    d => String(d.stage_id) === String(stage.id)
  ).length;
};

const getPipelineTotalLeads = pipeline => {
  return getDealsForPipeline(pipeline).length;
};

const filteredPipelines = computed(() => {
  if (!pipelineSearchQuery.value.trim()) return fullConfig.value.pipelines;
  const q = pipelineSearchQuery.value.toLowerCase().trim();
  return fullConfig.value.pipelines.filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
  );
});

const getPipelineUniqueAgents = pipeline => {
  const pipelineDeals = getDealsForPipeline(pipeline);
  const agentsMap = new Map();
  pipelineDeals.forEach(deal => {
    const assignee = deal.user;
    if (assignee && assignee.id) {
      agentsMap.set(assignee.id, assignee);
    }
  });
  return Array.from(agentsMap.values());
};

const getPipelineUniqueInboxes = pipeline => {
  const allConvs = store.getters.getAllConversations || [];
  const pipelineDeals = getDealsForPipeline(pipeline);
  const inboxesMap = new Map();
  pipelineDeals.forEach(deal => {
    if (!deal.conversation_id) return;
    const conv = allConvs.find(
      c => Number(c.id) === Number(deal.conversation_id)
    );
    const inboxId = conv?.inbox_id;
    if (inboxId) {
      const inbox = allInboxes.value.find(i => i.id === inboxId);
      if (inbox) inboxesMap.set(inboxId, inbox);
    }
  });
  return Array.from(inboxesMap.values());
};

import { getChannelMeta } from 'dashboard/helper/channelMeta.js';
import { KanbanAutomations } from './helpers/kanbanAutomations';
const getInboxChannelMeta = inbox => getChannelMeta(inbox.channel_type);

// Dashboard KPI computed
const pipelineStats = computed(() => {
  if (!activePipeline.value) return null;
  const pipelineDeals = getDealsForPipeline(activePipeline.value);
  const total = pipelineDeals.length;
  const open = pipelineDeals.filter(d =>
    ['open', 'in_progress'].includes(d.status)
  ).length;
  const won = pipelineDeals.filter(d => d.status === 'won').length;
  const lost = pipelineDeals.filter(d => d.status === 'lost').length;

  const stageDistribution = activePipeline.value.stages.map(stage => {
    const count = pipelineDeals.filter(
      d => String(d.stage_id) === String(stage.id)
    ).length;
    return { stage, count, percentage: total > 0 ? (count / total) * 100 : 0 };
  });

  return { total, open, won, lost, stageDistribution };
});

const isLoading = ref(true);

const fetchKanbanData = async () => {
  isLoading.value = true;
  try {
    await Promise.all([
      store.dispatch('deals/fetchDeals'),
      store.dispatch('labels/get'),
      store.dispatch('inboxes/get'),
      store.dispatch('agents/get'),
      store.dispatch('attributes/get'),
      loadKanbanConfig(),
    ]);
  } catch (err) {
    console.error('Failed to load Kanban data:', err);
  } finally {
    isLoading.value = false;
  }
};

let unsubscribeAutomations = null;

onMounted(() => {
  fetchKanbanData();
  unsubscribeAutomations = KanbanAutomations.register(store);
});

onBeforeUnmount(() => {
  if (unsubscribeAutomations) {
    unsubscribeAutomations();
    unsubscribeAutomations = null;
  }
});

// Filtered Deals based on Search, Agent, Status and Priority selects
const filteredDeals = computed(() => {
  let deals = [...allDeals.value];

  // 1. Text Search (Deal title, contact name)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    deals = deals.filter(d => {
      const title = (d.title || '').toLowerCase();
      const contactName = (d.contact?.name || '').toLowerCase();
      const dispId = String(d.id);
      return title.includes(q) || contactName.includes(q) || dispId.includes(q);
    });
  }

  // 2. Agent Filter (Responsável do Negócio)
  if (filterAgentId.value) {
    const agentIdNum = Number(filterAgentId.value);
    deals = deals.filter(d => Number(d.user_id) === agentIdNum);
  }

  // 3. Status Filter
  if (filterStatus.value) {
    deals = deals.filter(d => d.status === filterStatus.value);
  }

  // 4. Priority Filter (custom attribute)
  if (filterPriority.value) {
    deals = deals.filter(
      d => d.custom_attributes?.priority === filterPriority.value
    );
  }

  return deals;
});

const sortDeals = deals => {
  const sorted = [...deals];
  switch (sortBy.value) {
    case 'oldest':
      sorted.sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
      break;
    case 'value':
      sorted.sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
      break;
    case 'priority': {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      sorted.sort(
        (a, b) =>
          (order[a.custom_attributes?.priority] ?? 99) -
          (order[b.custom_attributes?.priority] ?? 99)
      );
      break;
    }
    default:
      sorted.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  }
  return sorted;
};

// Vue Draggable lists map
const columnsCardsMap = ref({});

const syncColumns = () => {
  if (!activePipeline.value) return;
  if (isLoading.value) return;

  const newMap = {};
  activePipeline.value.stages.forEach(stage => {
    newMap[stage.id] = [];
  });

  const dealsForPipeline = filteredDeals.value.filter(
    d => String(d.pipeline_id) === String(activePipeline.value.id)
  );

  sortDeals(dealsForPipeline).forEach(deal => {
    if (newMap[deal.stage_id]) {
      newMap[deal.stage_id].push(deal);
    }
  });

  columnsCardsMap.value = newMap;
};

let skipColumnSync = false;

// Sync lists when deals, active pipeline, or loading state modifies
watch(
  [filteredDeals, activePipeline, isLoading],
  () => {
    if (skipColumnSync) return;
    syncColumns();
  },
  { deep: true, immediate: true }
);

// Drag visual feedback — SortableJS classList.add doesn't support space-separated classes
const onDragStart = event => {
  if (event.item) {
    event.item.classList.add(
      'scale-105',
      'rotate-1',
      'opacity-90',
      'shadow-2xl',
      'rounded-xl',
      'z-50',
      'cursor-grabbing'
    );
  }
};

const onDragEnd = event => {
  if (event.item) {
    event.item.classList.remove(
      'scale-105',
      'rotate-1',
      'opacity-90',
      'shadow-2xl',
      'rounded-xl',
      'z-50',
      'cursor-grabbing'
    );
  }
};

// Drag and drop changes handler
const onCardDragChange = async (event, targetStage) => {
  if (!event.added) return;
  const item = event.added.element;
  skipColumnSync = true;

  try {
    let status = item.status;
    if (targetStage.is_won) status = 'won';
    else if (targetStage.is_lost) status = 'lost';

    await store.dispatch('deals/updateDeal', {
      id: item.id,
      stage_id: targetStage.id,
      pipeline_id: activePipeline.value.id,
      status,
    });

    if (
      activePipeline.value.automations?.auto_resolve_on_won_lost &&
      (targetStage.is_won || targetStage.is_lost) &&
      item.conversation_id
    ) {
      await store.dispatch('toggleStatus', {
        conversationId: item.conversation_id,
        status: 'resolved',
      });
    }
  } catch (err) {
    console.error('Failed to update stage via drag:', err);
    useAlert(err.response?.data?.error || 'Erro ao mover card');
  } finally {
    skipColumnSync = false;
  }
};

// Quick conclude a deal (winner stage)
const handleDealWon = async dealId => {
  try {
    await store.dispatch('deals/updateDeal', { id: dealId, status: 'won' });
  } catch (err) {
    console.error('Failed to conclude deal:', err);
  }
};

// Open the Deal creation/edition modal
const openCreateDeal = (stage, contactId = null) => {
  dealModalDeal.value = null;
  dealModalStageId.value = stage ? String(stage.id) : null;
  dealModalPipelineId.value = activePipeline.value
    ? activePipeline.value.id
    : null;
  dealModalContactId.value = contactId;
  showDealModal.value = true;
};

const openEditDeal = deal => {
  dealModalDeal.value = deal;
  showDealModal.value = true;
};

const closeDealModal = () => {
  showDealModal.value = false;
  dealModalDeal.value = null;
  dealModalStageId.value = null;
  dealModalPipelineId.value = null;
  dealModalContactId.value = null;
};

// Open Modals for Pipeline management
const openAddPipeline = () => {
  activeEditingPipeline.value = null;
  showSettingsModal.value = true;
};

const openEditPipeline = () => {
  activeEditingPipeline.value = activePipeline.value;
  showSettingsModal.value = true;
};

const closeSettingsModal = () => {
  showSettingsModal.value = false;
  activeEditingPipeline.value = null;
};

// Save edited pipeline
const savePipelineConfig = async updatedPipeline => {
  showSettingsModal.value = false;

  const pipelines = [...fullConfig.value.pipelines];
  const existingIndex = pipelines.findIndex(p => p.id === updatedPipeline.id);

  if (existingIndex > -1) {
    pipelines[existingIndex] = updatedPipeline;
  } else {
    pipelines.push(updatedPipeline);
  }

  const newConfig = { pipelines };

  try {
    // 1. Save serialized JSON into hidden label description
    await KanbanConfigHelper.saveConfig(store, configLabelId.value, newConfig);

    // Re-fetch config to refresh states
    await loadKanbanConfig();
    activePipelineId.value = updatedPipeline.id;
  } catch (err) {
    console.error('Failed to save pipeline configuration:', err);
  }
};

// Delete active pipeline
const deleteActivePipeline = async () => {
  if (!activePipeline.value) return;

  const isConfirmed = confirm(t('KANBAN.SETTINGS.DELETE_CONFIRM'));
  if (!isConfirmed) return;

  showSettingsModal.value = false;

  const remainingPipelines = fullConfig.value.pipelines.filter(
    p => p.id !== activePipeline.value.id
  );
  const newConfig = { pipelines: remainingPipelines };

  try {
    await KanbanConfigHelper.saveConfig(store, configLabelId.value, newConfig);
    await loadKanbanConfig();

    if (fullConfig.value.pipelines.length > 0) {
      activePipelineId.value = fullConfig.value.pipelines[0].id;
    } else {
      activePipelineId.value = null;
    }
  } catch (err) {
    console.error('Failed to delete pipeline:', err);
  }
};

// Sort handlers
const sortOptions = [
  { value: 'newest', label: 'Mais recente' },
  { value: 'oldest', label: 'Mais antigo' },
  { value: 'value', label: 'Maior valor' },
  { value: 'priority', label: 'Prioridade' },
];

const setSort = option => {
  sortBy.value = option.value;
  showSortLabel.value = option.label;
  showSortDropdown.value = false;
};

const handleAssign = ({ dealId, agentId }) => {
  store.dispatch('deals/updateDeal', { id: dealId, user_id: agentId });
};

const handleRemovePipeline = async dealId => {
  const isConfirmed = confirm(
    t('KANBAN.CARD.DELETE_CONFIRM') || 'Remover este negócio do funil?'
  );
  if (!isConfirmed) return;

  try {
    await store.dispatch('deals/deleteDeal', dealId);
  } catch (err) {
    console.error('Failed to remove deal from pipeline:', err);
  }
};
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template -->
  <!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
  <div
    class="flex flex-col w-full h-full bg-slate-950 font-sans overflow-hidden"
  >
    <!-- 1. Funis Overview (Visão geral) when activePipelineId is null -->
    <div
      v-if="activePipelineId === null"
      class="flex-grow flex flex-col h-full bg-slate-950 p-8 overflow-y-auto"
    >
      <!-- Overview Header -->
      <div
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 shrink-0"
      >
        <h2 class="text-2xl font-bold tracking-tight text-slate-100 shrink-0">
          Funis
        </h2>

        <div class="flex items-center gap-2.5">
          <!-- Sleek Filter Icon (Image 1 Style) -->
          <button
            type="button"
            class="p-2 border border-slate-850 hover:border-slate-800 hover:bg-slate-900/50 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
            title="Ordenar / Filtrar"
          >
            <Icon icon="i-lucide-sliders-horizontal" class="size-4 shrink-0" />
          </button>

          <Button
            blue
            class="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl shrink-0"
            @click="openAddPipeline"
          >
            <Icon icon="i-lucide-plus" class="size-4" />
            Adicionar Funil
          </Button>
        </div>
      </div>

      <!-- Funnels List -->
      <div class="flex flex-col gap-5 max-w-5xl">
        <div
          v-for="p in filteredPipelines"
          :key="p.id"
          class="bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-2xl p-6 transition-all cursor-pointer flex flex-col gap-4 shadow-lg hover:shadow-2xl"
          @click="selectPipeline(p)"
        >
          <!-- Pipeline Header Info -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="text-lg font-bold text-slate-200">{{ p.name }}</span>
              <span
                class="px-2.5 py-0.5 rounded-full bg-slate-950 text-xs font-semibold text-slate-400 border border-slate-800"
              >
                {{ getPipelineTotalLeads(p) }}
              </span>
            </div>

            <div class="flex items-center gap-3">
              <!-- Agent placeholder avatars (from the pipeline active leads) -->
              <div class="flex items-center -space-x-2">
                <Thumbnail
                  v-for="agent in getPipelineUniqueAgents(p).slice(0, 4)"
                  :key="agent.id"
                  :src="agent.thumbnail"
                  :username="agent.name"
                  size="26px"
                  class="border-2 border-slate-900 rounded-full shrink-0"
                />
                <span
                  v-if="getPipelineUniqueAgents(p).length > 4"
                  class="size-[26px] rounded-full border-2 border-slate-900 bg-slate-950 text-[10px] font-bold text-slate-400 flex items-center justify-center shrink-0 z-10"
                >
                  +{{ getPipelineUniqueAgents(p).length - 4 }}
                </span>
              </div>

              <!-- Inbox / Channel icons -->
              <div class="flex items-center gap-1">
                <span
                  v-for="inbox in getPipelineUniqueInboxes(p).slice(0, 4)"
                  :key="inbox.id"
                  :class="getInboxChannelMeta(inbox).color"
                  :title="inbox.name"
                  class="shrink-0 p-1 bg-slate-950/60 border border-slate-800 rounded-lg"
                >
                  <Icon
                    :icon="getInboxChannelMeta(inbox).icon"
                    class="size-3.5"
                  />
                </span>
                <span
                  v-if="getPipelineUniqueInboxes(p).length > 4"
                  class="text-[10px] font-bold text-slate-500 ml-1"
                >
                  +{{ getPipelineUniqueInboxes(p).length - 4 }}
                </span>
              </div>
            </div>
          </div>

          <!-- Stages Summary Horizontal Bar -->
          <div class="flex flex-wrap gap-2.5">
            <div
              v-for="stage in p.stages"
              :key="stage.id"
              class="bg-slate-950/70 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 flex items-center gap-2 border border-slate-850"
            >
              <span
                class="size-2 rounded-full"
                :style="{ backgroundColor: stage.color || '#3b82f6' }"
              />
              <span>{{ stage.title }}</span>
              <span class="text-slate-500 font-bold ml-0.5">{{
                getStageLeadsCount(stage, p)
              }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="filteredPipelines.length === 0"
          class="flex flex-col items-center justify-center py-20 text-center gap-4 bg-slate-900/20 border border-dashed border-slate-850 rounded-2xl"
        >
          <div class="p-4 bg-slate-900/60 rounded-full text-slate-500">
            <Icon icon="i-lucide-folder-open" class="size-8" />
          </div>
          <div class="flex flex-col gap-1 max-w-sm">
            <h3 class="text-sm font-bold text-slate-300">
              Nenhum funil configurado
            </h3>
            <p class="text-xs text-slate-500 font-medium">
              Crie seu primeiro funil para gerenciar leads, propostas e
              fechamento comercial de forma visual.
            </p>
          </div>
          <Button blue small class="mt-2" @click="openAddPipeline">
            <Icon icon="i-lucide-plus" class="size-3.5" />
            Adicionar Funil
          </Button>
        </div>
      </div>
    </div>

    <!-- 2. Kanban Board (when activePipelineId is NOT null) -->
    <template v-else>
      <!-- Header Top Section (Sleek & Aligned as in Image 1) -->
      <header
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-6 py-3 border-b border-slate-900 bg-slate-950 shrink-0"
      >
        <!-- Title & Total Leads count badge (Image 1 Left Side) -->
        <div class="flex items-center gap-2.5">
          <!-- Back button to return to Overview -->
          <button
            type="button"
            class="p-1.5 -ml-1 text-slate-400 hover:text-slate-200 transition-colors bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl"
            title="Voltar para Funis"
            @click="activePipelineId = null"
          >
            <Icon icon="i-lucide-chevron-left" class="size-4.5" />
          </button>

          <h2
            class="text-base font-bold tracking-tight text-slate-100 shrink-0"
          >
            {{ activePipeline?.name }}
          </h2>

          <span
            class="px-2 py-0.5 rounded-full bg-slate-900 text-[10px] font-bold text-slate-400 border border-slate-800"
          >
            {{ getPipelineTotalLeads(activePipeline) }}
          </span>
        </div>

        <!-- Filters & Action Buttons (Image 1 Right Side) -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Live Search Bar (Compact & Sleek with Perfect Centering) -->
          <div class="relative w-44">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Pesquisar..."
              class="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-850 bg-slate-900 text-slate-200 text-xs focus:border-blue-500 outline-none placeholder:text-slate-500"
            />
            <span
              class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center"
            >
              <Icon icon="i-lucide-search" class="size-3.5" />
            </span>
          </div>

          <!-- Filter Agents (Compact & Premium) -->
          <div class="relative">
            <select
              v-model="filterAgentId"
              class="pl-7 pr-7 py-1.5 rounded-xl border border-slate-850 bg-slate-900 text-slate-300 text-xs font-semibold outline-none cursor-pointer focus:border-blue-500 appearance-none min-w-[130px]"
            >
              <option value="">Todos os agentes</option>
              <option
                v-for="agent in allAgents"
                :key="agent.id"
                :value="agent.id"
              >
                {{ agent.name }}
              </option>
            </select>
            <span
              class="absolute left-2.5 top-2 text-slate-500 pointer-events-none"
            >
              <Icon icon="i-lucide-user" class="size-3.5" />
            </span>
            <span
              class="absolute right-2.5 top-2.5 text-slate-500 pointer-events-none"
            >
              <Icon icon="i-lucide-chevron-down" class="size-3" />
            </span>
          </div>

          <!-- Filter Status (Negócios abertos/ganhos/perdidos) -->
          <div class="relative">
            <select
              v-model="filterStatus"
              class="pl-7 pr-7 py-1.5 rounded-xl border border-slate-850 bg-slate-900 text-slate-300 text-xs font-semibold outline-none cursor-pointer focus:border-blue-500 appearance-none min-w-[130px]"
            >
              <option value="">Todos os status</option>
              <option value="open">Aberto</option>
              <option value="in_progress">Em andamento</option>
              <option value="won">Ganho</option>
              <option value="lost">Perdido</option>
            </select>
            <span
              class="absolute left-2.5 top-2 text-slate-500 pointer-events-none"
            >
              <Icon icon="i-lucide-chart-pie" class="size-3.5" />
            </span>
            <span
              class="absolute right-2.5 top-2.5 text-slate-500 pointer-events-none"
            >
              <Icon icon="i-lucide-chevron-down" class="size-3" />
            </span>
          </div>

          <!-- Filter Priority -->
          <div class="relative">
            <select
              v-model="filterPriority"
              class="pl-7 pr-7 py-1.5 rounded-xl border border-slate-850 bg-slate-900 text-slate-300 text-xs font-semibold outline-none cursor-pointer focus:border-blue-500 appearance-none min-w-[120px]"
            >
              <option value="">Todas prioridades</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
            <span
              class="absolute left-2.5 top-2 text-slate-500 pointer-events-none"
            >
              <Icon icon="i-lucide-flag" class="size-3.5" />
            </span>
            <span
              class="absolute right-2.5 top-2.5 text-slate-500 pointer-events-none"
            >
              <Icon icon="i-lucide-chevron-down" class="size-3" />
            </span>
          </div>

          <!-- Order Icon with dropdown -->
          <div class="relative">
            <button
              type="button"
              class="p-1.5 border border-slate-850 hover:border-slate-800 hover:bg-slate-900/50 rounded-xl text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1"
              title="Ordenar"
              @click="showSortDropdown = !showSortDropdown"
            >
              <Icon icon="i-lucide-arrow-up-down" class="size-3.5 shrink-0" />
              <span class="text-[10px] font-semibold hidden sm:inline">{{
                showSortLabel
              }}</span>
            </button>
            <div
              v-if="showSortDropdown"
              class="absolute top-9 right-0 flex flex-col min-w-[150px] bg-slate-900 border border-slate-800 shadow-xl rounded-lg overflow-hidden py-1 z-30 animate-in fade-in slide-in-from-top-1"
            >
              <button
                v-for="opt in sortOptions"
                :key="opt.value"
                type="button"
                class="px-3 py-1.5 text-xs text-left font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                :class="{ 'text-blue-400': sortBy === opt.value }"
                @click="setSort(opt)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Edit pipeline settings gear -->
          <button
            type="button"
            class="p-1.5 border border-slate-850 hover:border-slate-800 hover:bg-slate-900/50 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
            title="Configurações do Funil"
            @click="openEditPipeline"
          >
            <Icon icon="i-lucide-settings" class="size-3.5 shrink-0" />
          </button>

          <!-- Add Deal Button (Blue block) -->
          <Button
            blue
            class="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl shrink-0"
            @click="openCreateDeal()"
          >
            <Icon icon="i-lucide-plus" class="size-3.5" />
            Adicionar Negócio
          </Button>
        </div>
      </header>

      <!-- KPI Dashboard Bar -->
      <div
        v-if="pipelineStats"
        class="flex items-center gap-5 px-6 py-2.5 bg-slate-900/40 border-b border-slate-900/60 shrink-0"
      >
        <div class="flex items-center gap-2">
          <span
            class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
          >
            Total
          </span>
          <span class="text-sm font-bold text-slate-100">{{
            pipelineStats.total
          }}</span>
        </div>
        <div class="w-px h-4 bg-slate-800" />
        <div class="flex items-center gap-2">
          <span class="size-2 rounded-full bg-emerald-500" />
          <span
            class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
          >
            Ganhos
          </span>
          <span class="text-sm font-bold text-emerald-400">{{
            pipelineStats.won
          }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="size-2 rounded-full bg-rose-500" />
          <span
            class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
          >
            Perdidos
          </span>
          <span class="text-sm font-bold text-slate-400">{{
            pipelineStats.lost
          }}</span>
        </div>
        <div class="w-px h-4 bg-slate-800" />
        <!-- Per-stage distribution bar -->
        <div class="flex-1 flex items-center gap-1 max-w-md">
          <div
            class="flex-1 flex items-center h-2 bg-slate-800 rounded-full overflow-hidden"
          >
            <div
              v-for="item in pipelineStats.stageDistribution"
              :key="item.stage.id"
              v-tooltip="
                `${item.stage.title}: ${item.count} (${item.percentage.toFixed(0)}%)`
              "
              class="h-full transition-all duration-300"
              :style="{
                width: item.percentage + '%',
                backgroundColor: item.stage.color || '#3b82f6',
              }"
            />
          </div>
          <div class="flex items-center gap-1.5 ml-2">
            <span
              v-for="item in pipelineStats.stageDistribution"
              :key="item.stage.id"
              class="flex items-center gap-1 text-[9px] font-semibold text-slate-500"
            >
              <span
                class="size-1.5 rounded-full"
                :style="{ backgroundColor: item.stage.color || '#3b82f6' }"
              />
              <span class="hidden sm:inline">{{ item.stage.title }}</span>
              <span>{{ item.count }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Draggable Stage Board Columns -->
      <main
        class="flex-grow flex gap-4 p-5 overflow-x-auto overflow-y-hidden relative"
      >
        <div
          v-if="isLoading"
          class="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm z-50"
        >
          <Spinner size="40" class="text-n-brand" />
        </div>
        <!-- Stage Column -->
        <template v-else>
          <div
            v-for="stage in activePipeline?.stages"
            :key="stage.id"
            class="group/col flex flex-col flex-1 min-w-[280px] max-w-[550px] shrink-0 bg-slate-900/40 border border-slate-900 rounded-2xl overflow-hidden hover:border-slate-850 transition"
          >
            <!-- Column Header Info (Vibrant Full-Width Solid Colored Header as in Image 1) -->
            <div
              class="flex items-center justify-between px-4 py-3 shrink-0 text-white rounded-t-2xl border-b border-slate-950/40"
              :style="{ backgroundColor: stage.color || '#3b82f6' }"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs font-bold text-white truncate">{{
                  stage.title
                }}</span>

                <!-- Total Leads Counter Badge -->
                <span
                  class="px-1.5 py-0.5 rounded-full bg-black/25 text-[10px] font-bold text-white/95"
                >
                  {{ columnsCardsMap[stage.id]?.length || 0 }}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <!-- Stage Add Deal Button -->
                <button
                  type="button"
                  class="text-white/80 hover:text-white transition-colors"
                  title="Adicionar negócio"
                  @click="openCreateDeal(stage)"
                >
                  <Icon icon="i-lucide-plus" class="size-4" />
                </button>
              </div>
            </div>

            <!-- Draggable Cards Container -->
            <div
              class="flex-1 overflow-y-auto px-3.5 py-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
            >
              <Draggable
                v-model="columnsCardsMap[stage.id]"
                group="kanban-deals"
                item-key="id"
                animation="200"
                class="flex flex-col gap-3.5 min-h-[300px] h-full"
                @change="onCardDragChange($event, stage)"
                @start="onDragStart"
                @end="onDragEnd"
              >
                <template #item="{ element }">
                  <KanbanCard
                    :deal="element"
                    :conversation="element.conversation || {}"
                    :pipeline-agents="activePipeline?.agents || []"
                    @edit="openEditDeal"
                    @won="handleDealWon"
                    @assign="handleAssign"
                    @remove-pipeline="handleRemovePipeline"
                  />
                </template>
              </Draggable>
            </div>

            <!-- "+ Adicionar Negócio" Button -->
            <div class="p-3 border-t border-slate-900/40 shrink-0">
              <button
                type="button"
                class="w-full py-2 px-3 hover:bg-slate-900/50 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-900"
                @click="openCreateDeal(stage)"
              >
                <Icon icon="i-lucide-plus" class="size-4 shrink-0" />
                Adicionar Negócio
              </button>
            </div>
          </div>
        </template>
      </main>
    </template>

    <!-- Pipeline Configurations Settings Modal -->
    <PipelineSettingsModal
      v-if="showSettingsModal"
      :is-open="showSettingsModal"
      :pipeline="activeEditingPipeline"
      :label-id="configLabelId"
      :full-config="fullConfig"
      @close="closeSettingsModal"
      @save="savePipelineConfig"
      @delete="deleteActivePipeline"
    />

    <!-- Create/Edit Deal Modal -->
    <CreateDealModal
      :show="showDealModal"
      :contact-id="dealModalContactId"
      :initial-pipeline-id="dealModalPipelineId"
      :initial-stage-id="dealModalStageId"
      :deal="dealModalDeal"
      @close="closeDealModal"
      @saved="closeDealModal"
    />
  </div>
</template>
