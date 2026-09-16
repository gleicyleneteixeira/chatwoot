<script setup>
/* eslint-disable no-console */
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'dashboard/composables/store';
import { useI18n } from 'vue-i18n';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import DealsApi from '../../../api/deals';
import { KanbanConfigHelper } from '../../../routes/dashboard/kanban/helpers/kanbanConfig';

const props = defineProps({
  contactId: {
    type: [Number, String],
    default: null,
  },
  contactName: {
    type: String,
    default: '',
  },
  conversationId: {
    type: [Number, String],
    default: null,
  },
  fromKanban: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'created']);

const { t } = useI18n();
const store = useStore();

const title = ref(props.contactName || '');
const value = ref(0);
const description = ref('');
const selectedContactId = ref(props.contactId || null);
const selectedUserId = ref(null);
const selectedPipelineId = ref(null);
const selectedStageId = ref(null);
const customAttributes = ref({});

const isSaving = ref(false);
const contactSearchQuery = ref('');
const contactSearchResults = ref([]);
const showContactDropdown = ref(false);

const pipelines = ref([]);

const allAgents = computed(() => store.getters['agents/getAgents'] || []);

const selectedPipeline = computed(() => {
  return pipelines.value.find(p => p.id === selectedPipelineId.value) || null;
});

const availableStages = computed(() => {
  return selectedPipeline.value?.stages || [];
});

const dealAttributeDefs = ref([]);

onMounted(async () => {
  try {
    const { config } = await KanbanConfigHelper.loadConfig(store);
    pipelines.value = config.pipelines || [];
    if (pipelines.value.length > 0) {
      selectedPipelineId.value = pipelines.value[0].id;
      if (pipelines.value[0].stages?.length > 0) {
        selectedStageId.value = pipelines.value[0].stages[0].id;
      }
    }
  } catch (err) {
    console.error('Failed to load pipeline config:', err);
  }

  try {
    const attrs = store.getters['attributes/getAttributes'] || [];
    dealAttributeDefs.value = attrs.filter(
      a => a.attribute_model === 'deal_attribute'
    );
  } catch (err) {
    // ignore
  }

  store.dispatch('agents/get');
});

const searchContacts = async () => {
  if (!contactSearchQuery.value || contactSearchQuery.value.length < 2) {
    contactSearchResults.value = [];
    return;
  }
  try {
    const response = await store.dispatch(
      'contacts/search',
      { search: contactSearchQuery.value }
    );
    contactSearchResults.value = response || [];
  } catch (err) {
    console.error('Contact search failed:', err);
  }
};

const selectContact = contact => {
  selectedContactId.value = contact.id;
  if (!title.value || title.value === props.contactName) {
    title.value = contact.name || '';
  }
  contactSearchQuery.value = contact.name || '';
  showContactDropdown.value = false;
  contactSearchResults.value = [];
};

const handleSave = async () => {
  if (!title.value.trim() || !selectedContactId.value) return;

  isSaving.value = true;
  try {
    const dealData = {
      title: title.value.trim(),
      value: Number(value.value) || 0,
      description: description.value.trim(),
      contact_id: selectedContactId.value,
      conversation_id: props.conversationId || null,
      user_id: selectedUserId.value || null,
      custom_attributes: {
        ...customAttributes.value,
        pipeline_id: selectedPipelineId.value,
        kanban_stage: selectedStageId.value,
      },
    };
    await DealsApi.createDeal(dealData);
    emit('created');
  } catch (err) {
    console.error('Failed to create deal:', err);
  } finally {
    isSaving.value = false;
  }
};

const formatCurrency = val => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
};
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
  >
    <div
      class="flex flex-col w-full max-w-lg max-h-[85vh] border bg-slate-900 border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-slate-800"
      >
        <h3 class="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Icon icon="i-lucide-briefcase" class="text-blue-500 size-5" />
          {{ t('DEAL.CREATE.TITLE') || '+ Criar Novo Negócio' }}
        </h3>
        <button
          type="button"
          class="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          @click="emit('close')"
        >
          <Icon icon="i-lucide-x" class="size-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <!-- Contact Selector (only from kanban) -->
        <div v-if="fromKanban && !contactId" class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-300">
            {{ t('DEAL.CREATE.CONTACT') || 'Contato' }} *
          </label>
          <div class="relative">
            <input
              v-model="contactSearchQuery"
              type="text"
              class="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:border-blue-500 outline-none"
              :placeholder="t('DEAL.CREATE.SEARCH_CONTACT') || 'Buscar contato...'"
              @input="searchContacts"
              @focus="showContactDropdown = true"
            />
            <div
              v-if="showContactDropdown && contactSearchResults.length > 0"
              class="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto z-10"
            >
              <button
                v-for="c in contactSearchResults"
                :key="c.id"
                type="button"
                class="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-2"
                @click="selectContact(c)"
              >
                <span class="font-semibold">{{ c.name }}</span>
                <span class="text-slate-500">{{ c.email || c.phone_number }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Title -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-300">
            {{ t('DEAL.CREATE.DEAL_TITLE') || 'Título do Negócio' }} *
          </label>
          <input
            v-model="title"
            type="text"
            class="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:border-blue-500 outline-none"
            :placeholder="t('DEAL.CREATE.TITLE_PLACEHOLDER') || 'Ex: Proposta Comercial'"
          />
        </div>

        <!-- Value -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-300">
            {{ t('DEAL.CREATE.VALUE') || 'Valor (R$)' }}
          </label>
          <input
            v-model="value"
            type="number"
            min="0"
            step="0.01"
            class="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:border-blue-500 outline-none"
            placeholder="0,00"
          />
        </div>

        <!-- Pipeline & Stage -->
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">
              {{ t('DEAL.CREATE.PIPELINE') || 'Funil' }}
            </label>
            <select
              v-model="selectedPipelineId"
              class="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-xs focus:border-blue-500 outline-none"
            >
              <option
                v-for="p in pipelines"
                :key="p.id"
                :value="p.id"
              >
                {{ p.name }}
              </option>
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-slate-300">
              {{ t('DEAL.CREATE.STAGE') || 'Etapa Inicial' }}
            </label>
            <select
              v-model="selectedStageId"
              class="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-xs focus:border-blue-500 outline-none"
            >
              <option
                v-for="s in availableStages"
                :key="s.id"
                :value="s.id"
              >
                {{ s.title }}
              </option>
            </select>
          </div>
        </div>

        <!-- Assignee -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-300">
            {{ t('DEAL.CREATE.ASSIGNEE') || 'Responsável' }}
          </label>
          <select
            v-model="selectedUserId"
            class="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-xs focus:border-blue-500 outline-none"
          >
            <option :value="null">—</option>
            <option
              v-for="agent in allAgents"
              :key="agent.id"
              :value="agent.id"
            >
              {{ agent.name }}
            </option>
          </select>
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-300">
            {{ t('DEAL.CREATE.DESCRIPTION') || 'Descrição' }}
          </label>
          <textarea
            v-model="description"
            rows="3"
            class="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:border-blue-500 outline-none resize-none"
            :placeholder="t('DEAL.CREATE.DESC_PLACEHOLDER') || 'Observações sobre o negócio...'"
          />
        </div>

        <!-- Custom Attributes -->
        <div
          v-if="dealAttributeDefs.length > 0"
          class="space-y-3 pt-2 border-t border-slate-800"
        >
          <h4 class="text-[10px] uppercase font-bold tracking-wider text-slate-500">
            {{ t('DEAL.CREATE.CUSTOM_FIELDS') || 'Campos Personalizados' }}
          </h4>
          <div
            v-for="attr in dealAttributeDefs"
            :key="attr.attribute_key"
            class="space-y-1"
          >
            <label class="text-xs font-semibold text-slate-300">
              {{ attr.attribute_display_name }}
            </label>
            <input
              v-model="customAttributes[attr.attribute_key]"
              type="text"
              class="w-full px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-slate-200 text-xs focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/40"
      >
        <Button
          md
          class="border border-slate-700 hover:bg-slate-800 text-slate-300"
          @click="emit('close')"
        >
          {{ t('DEAL.CREATE.CANCEL') || 'Cancelar' }}
        </Button>
        <Button
          md
          blue
          solid
          :disabled="!title.trim() || !selectedContactId || isSaving"
          @click="handleSave"
        >
          <Icon v-if="isSaving" icon="i-lucide-loader-2" class="size-4 animate-spin" />
          <Icon v-else icon="i-lucide-check" class="size-4" />
          {{ t('DEAL.CREATE.SAVE') || 'Salvar Negócio' }}
        </Button>
      </div>
    </div>
  </div>
</template>
