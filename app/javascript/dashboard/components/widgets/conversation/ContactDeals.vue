<script setup>
/* eslint-disable no-console */
import { computed, ref, onMounted } from 'vue';
import { useStore } from 'dashboard/composables/store';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import Thumbnail from 'dashboard/components/widgets/Thumbnail.vue';
import CreateDealModal from './CreateDealModal.vue';
import DealsApi from '../../../api/deals';

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

const { t } = useI18n();
const store = useStore();
const route = useRoute();
const router = useRouter();

const deals = ref([]);
const isLoading = ref(false);
const showCreateModal = ref(false);
const hoveredDealId = ref(null);

const contact = computed(() => {
  return store.getters['contacts/getContact'](props.contactId) || {};
});

const fetchDeals = async () => {
  isLoading.value = true;
  try {
    const response = await DealsApi.getDeals({ contactId: props.contactId });
    deals.value = (response.data.deals || []).filter(
      d => d.status === 'open' || d.status === 'in_progress'
    );
  } catch (err) {
    console.error('Failed to fetch deals:', err);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchDeals();
});

const formatCurrency = value => {
  if (!value && value !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const navigateToDeal = deal => {
  if (deal.conversation_id) {
    const accountId = route.params.accountId;
    router.push({
      name: 'inbox_conversation',
      params: {
        accountId,
        conversation_id: deal.conversation_id,
      },
    });
  }
};

import { KanbanConfigHelper } from '../../../kanban/helpers/kanbanConfig';

// Import KanbanConfigHelper from the correct location
const KanbanConfigHelper = {
  getConfigFromStorage: () => {
    const kanbanConfig = JSON.parse(
      localStorage.getItem('kanban_config') || '{}'
    );
    return kanbanConfig.pipelines || [];
  }
};

const getDealStageName = deal => {
  const pipelines = KanbanConfigHelper.getConfigFromStorage();
  for (const pipeline of pipelines) {
    const stage = pipeline.stages?.find(s => s.id === deal.custom_attributes?.kanban_stage);
    if (stage) return stage.title;
  }
  return null;
};

const getStageColor = deal => {
  const pipelines = KanbanConfigHelper.getConfigFromStorage();
  for (const pipeline of pipelines) {
    const stage = pipeline.stages?.find(s => s.id === deal.custom_attributes?.kanban_stage);
    if (stage) return stage.color || '#3b82f6';
  }
  return '#3b82f6';
};

const dealAttributeDefs = computed(() => {
  const allAttrs = store.getters['attributes/getAttributes'] || [];
  return allAttrs.filter(
    a => a.attribute_model === 'deal_attribute' && a.show_on_sidebar
  );
});

const getCustomAttributeValue = (deal, key) => {
  return deal.custom_attributes?.[key] || null;
};

const onDealCreated = () => {
  showCreateModal.value = false;
  fetchDeals();
};
</script>

<template>
  <div class="flex flex-col gap-2 py-2 px-1">
    <!-- Header -->
    <div class="flex items-center justify-between px-1">
      <span
        class="text-[10px] uppercase font-bold tracking-wider text-slate-500"
      >
        {{ t('DEAL.SIDEBAR.TITLE') || 'Negócios' }}
      </span>
      <button
        type="button"
        class="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-blue-400 hover:bg-blue-500/10 transition-colors"
        @click="showCreateModal = true"
      >
        <Icon icon="i-lucide-plus" class="size-3" />
        {{ t('DEAL.SIDEBAR.CREATE') || 'Criar Novo Negócio' }}
      </button>
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading"
      class="flex items-center justify-center py-6 text-slate-500"
    >
      <Icon icon="i-lucide-loader-2" class="size-4 animate-spin" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="deals.length === 0"
      class="flex flex-col items-center justify-center py-6 text-center gap-2"
    >
      <div class="p-2 bg-slate-900 rounded-full text-slate-600">
        <Icon icon="i-lucide-briefcase" class="size-5" />
      </div>
      <p class="text-[11px] text-slate-500 font-medium">
        {{ t('DEAL.SIDEBAR.EMPTY') || 'Nenhum negócio aberto no momento' }}
      </p>
    </div>

    <!-- Deals List -->
    <div v-else class="flex flex-col gap-1.5">
      <div
        v-for="deal in deals"
        :key="deal.id"
        class="group relative flex flex-col gap-1.5 p-2.5 rounded-lg border border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/50 cursor-pointer transition-all"
        @click="navigateToDeal(deal)"
        @mouseenter="hoveredDealId = deal.id"
        @mouseleave="hoveredDealId = null"
      >
        <!-- Deal Title + Value -->
        <div class="flex items-start justify-between gap-2">
          <span class="text-xs font-bold text-slate-200 truncate">
            {{ deal.title }}
          </span>
          <span
            class="text-[10px] font-bold text-emerald-400 shrink-0"
          >
            {{ formatCurrency(deal.value) }}
          </span>
        </div>

        <!-- Stage Badge -->
        <div class="flex items-center gap-1.5">
          <span
            v-if="getDealStageName(deal)"
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border"
            :style="{
              backgroundColor: getStageColor(deal) + '15',
              borderColor: getStageColor(deal) + '30',
              color: getStageColor(deal),
            }"
          >
            <span
              class="size-1.5 rounded-full"
              :style="{ backgroundColor: getStageColor(deal) }"
            />
            {{ getDealStageName(deal) }}
          </span>
        </div>

        <!-- Custom Attributes (show_on_sidebar) -->
        <div
          v-if="dealAttributeDefs.length > 0"
          class="flex flex-col gap-0.5"
        >
          <div
            v-for="attr in dealAttributeDefs"
            :key="attr.attribute_key"
            class="flex items-center gap-1.5"
          >
            <span class="text-[9px] text-slate-500 font-medium">
              {{ attr.attribute_display_name }}:
            </span>
            <span class="text-[9px] text-slate-300 font-semibold">
              {{ getCustomAttributeValue(deal, attr.attribute_key) || '—' }}
            </span>
          </div>
        </div>

        <!-- Hover Tooltip -->
        <div
          v-if="hoveredDealId === deal.id"
          class="absolute bottom-full left-0 right-0 mb-2 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 pointer-events-none"
        >
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-100">{{
                deal.title
              }}</span>
              <span class="text-xs font-bold text-emerald-400">{{
                formatCurrency(deal.value)
              }}</span>
            </div>
            <div class="flex items-center gap-2 text-[10px] text-slate-400">
              <span v-if="deal.user?.name">
                <Icon icon="i-lucide-user" class="size-3 inline" />
                {{ deal.user.name }}
              </span>
              <span v-if="getDealStageName(deal)">
                <Icon icon="i-lucide-kanban" class="size-3 inline" />
                {{ getDealStageName(deal) }}
              </span>
            </div>
            <p
              v-if="deal.description"
              class="text-[10px] text-slate-400 line-clamp-2"
            >
              {{ deal.description }}
            </p>
            <div
              v-for="attr in dealAttributeDefs"
              :key="attr.attribute_key"
              class="flex items-center gap-1 text-[10px]"
            >
              <span class="text-slate-500">{{ attr.attribute_display_name }}:</span>
              <span class="text-slate-300">{{
                getCustomAttributeValue(deal, attr.attribute_key) || '—'
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Deal Modal -->
    <CreateDealModal
      v-if="showCreateModal"
      :contact-id="contactId"
      :contact-name="contact.name"
      :conversation-id="conversationId"
      @close="showCreateModal = false"
      @created="onDealCreated"
    />
  </div>
</template>
