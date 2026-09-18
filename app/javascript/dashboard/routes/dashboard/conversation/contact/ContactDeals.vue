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
const hoveredDealId = ref(null);

// Get custom attribute definitions for deals
const sidebarCustomAttrDefs = computed(() => {
  const dealDefs =
    store.getters['attributes/getAttributesByModel']('deal_attribute') || [];
  return dealDefs.filter(def => def.show_on_sidebar === true);
});

// Filter deals to ONLY show active/open deals (open or in_progress, excluding won/lost)
const activeDeals = computed(() => {
  const allContactDeals =
    store.getters['deals/getDealsByContactId'](props.contactId) || [];
  return allContactDeals.filter(
    deal =>
      deal.status === 'open' ||
      deal.status === 'in_progress' ||
      !['won', 'lost'].includes(deal.status)
  );
});

const isFetching = computed(() => {
  return store.getters['deals/getUIFlags']?.isFetching || false;
});

const loadData = async () => {
  if (!props.contactId) return;
  try {
    const { config } = await KanbanConfigHelper.loadConfig(store);
    fullConfig.value = config;
    await store.dispatch('deals/fetchDeals', {
      contact_id: props.contactId,
      status: 'active',
    });
    await store.dispatch('attributes/get');
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

const getPipelineName = pipelineId => {
  const pipeline = fullConfig.value.pipelines?.find(
    p => String(p.id) === String(pipelineId)
  );
  return pipeline ? pipeline.name : 'Funil Comercial';
};

const getStageName = (pipelineId, stageId) => {
  const pipeline = fullConfig.value.pipelines?.find(
    p => String(p.id) === String(pipelineId)
  );
  if (!pipeline) return stageId;
  const stage = pipeline.stages?.find(s => String(s.id) === String(stageId));
  return stage ? stage.title || stage.name : stageId;
};

// Filter deal custom attributes to only show those configured for sidebar
const getSidebarCustomAttributes = deal => {
  if (!deal.custom_attributes) return [];
  const entries = Object.entries(deal.custom_attributes);
  if (sidebarCustomAttrDefs.value.length === 0) {
    // Fallback: if no definitions marked, show entries if any exist
    return entries.filter(
      entry => entry[1] !== null && entry[1] !== undefined && entry[1] !== ''
    );
  }

  const allowedKeys = sidebarCustomAttrDefs.value.map(def => def.attribute_key);
  return entries.filter(
    ([key, val]) =>
      allowedKeys.includes(key) &&
      val !== null &&
      val !== undefined &&
      val !== ''
  );
};

const getCustomAttributeLabel = key => {
  const def = sidebarCustomAttrDefs.value.find(d => d.attribute_key === key);
  return def ? def.attribute_display_name : key;
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
  <!-- eslint-disable vue/no-bare-strings-in-template -->
  <!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
  <div class="flex flex-col gap-3 py-2">
    <!-- Header with Add Deal Button -->
    <div class="flex items-center justify-between px-1">
      <span
        class="text-xs font-semibold text-n-slate-11 uppercase tracking-wider"
      >
        Negócios do Contato ({{ activeDeals.length }})
      </span>
      <button
        type="button"
        class="flex items-center gap-1 text-xs font-bold text-n-brand-10 hover:text-n-brand-11 transition-colors"
        @click="openCreateModal"
      >
        <span>+ Criar Novo Negócio</span>
      </button>
    </div>

    <!-- Spinner Loading State -->
    <div
      v-if="isFetching && activeDeals.length === 0"
      class="flex items-center justify-center p-4"
    >
      <Spinner size="small" />
    </div>

    <!-- Empty State for Active Deals -->
    <div
      v-else-if="activeDeals.length === 0"
      class="flex flex-col items-center justify-center p-4 text-center rounded-xl border border-dashed border-n-slate-4 bg-n-slate-1"
    >
      <span class="text-xs font-medium text-n-slate-10 mb-2">
        Nenhum negócio aberto no momento.
      </span>
      <Button size="small" transparent blue @click="openCreateModal">
        + Criar Novo Negócio
      </Button>
    </div>

    <!-- Deals List -->
    <div v-else class="flex flex-col gap-2">
      <div
        v-for="deal in activeDeals"
        :key="deal.id"
        class="group relative flex flex-col p-3 rounded-xl border border-n-slate-4 bg-n-slate-2 hover:border-n-brand-6 hover:shadow-md transition-all cursor-pointer"
        @mouseenter="hoveredDealId = deal.id"
        @mouseleave="hoveredDealId = null"
        @click="goToKanban(deal)"
      >
        <!-- Deal Header: Title & Kanban Shortcut -->
        <div class="flex items-start justify-between gap-2 mb-1">
          <span
            class="text-xs font-bold text-n-slate-12 line-clamp-1 hover:text-n-brand-11"
            @click.stop="openEditModal(deal)"
          >
            {{ deal.title }}
          </span>
          <button
            type="button"
            class="p-1 text-n-slate-10 hover:text-n-brand-10 rounded transition-colors shrink-0"
            title="Ver no Quadro Kanban"
            @click.stop="goToKanban(deal)"
          >
            <Icon icon="i-lucide-kanban" class="w-4 h-4" />
          </button>
        </div>

        <!-- Deal Value & Stage Badge -->
        <div class="flex items-center justify-between mt-1 text-xs">
          <span class="font-bold text-n-emerald-10">
            {{
              deal.formatted_value ||
              (deal.value ? `R$ ${Number(deal.value).toFixed(2)}` : 'R$ 0,00')
            }}
          </span>
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-n-brand-2 text-n-brand-11 border border-n-brand-4 truncate max-w-[130px]"
          >
            {{ getStageName(deal.pipeline_id, deal.stage_id) }}
          </span>
        </div>

        <!-- Display Sidebar-flagged Custom Attributes -->
        <div
          v-if="getSidebarCustomAttributes(deal).length > 0"
          class="flex flex-wrap gap-1 mt-2 pt-1 border-t border-n-slate-3"
        >
          <span
            v-for="[key, val] in getSidebarCustomAttributes(deal)"
            :key="key"
            class="px-1.5 py-0.5 text-[9px] font-medium rounded bg-n-slate-3 text-n-slate-11"
          >
            {{ getCustomAttributeLabel(key) }}: {{ val }}
          </span>
        </div>

        <!-- Floating Context Tooltip / Hover Summary Card -->
        <div
          v-if="hoveredDealId === deal.id"
          class="absolute left-0 right-0 -bottom-2 translate-y-full z-40 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-3 text-slate-100 text-xs animate-in fade-in slide-in-from-top-1 pointer-events-none"
        >
          <div
            class="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2"
          >
            <span class="font-bold text-slate-100 truncate max-w-[180px]">{{
              deal.title
            }}</span>
            <span class="font-bold text-emerald-400">
              {{ deal.formatted_value || `R$ ${(deal.value || 0).toFixed(2)}` }}
            </span>
          </div>

          <div class="space-y-1 text-[11px] text-slate-300">
            <div>
              <span class="text-slate-500 font-semibold">Funil:</span>
              {{ getPipelineName(deal.pipeline_id) }}
            </div>
            <div>
              <span class="text-slate-500 font-semibold">Etapa:</span>
              {{ getStageName(deal.pipeline_id, deal.stage_id) }}
            </div>
            <div>
              <span class="text-slate-500 font-semibold">Responsável:</span>
              {{ deal.user?.name || deal.assignee?.name || 'Não atribuído' }}
            </div>
            <div
              v-if="
                deal.custom_attributes &&
                Object.keys(deal.custom_attributes).length > 0
              "
            >
              <span class="text-slate-500 font-semibold block mt-1">
                Campos Personalizados:
              </span>
              <div
                class="flex flex-col gap-0.5 pl-2 mt-0.5 border-l border-slate-700"
              >
                <span
                  v-for="[k, v] in Object.entries(deal.custom_attributes)"
                  :key="k"
                  class="text-[10px] text-slate-300"
                >
                  <strong class="text-slate-400">{{ k }}:</strong> {{ v }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <CreateDealModal
      :show="showModal"
      :contact-id="props.contactId"
      :conversation-id="props.conversationId"
      :deal="editingDeal"
      @close="showModal = false"
      @saved="loadData"
    />
  </div>
</template>
