<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import Modal from 'dashboard/components/Modal.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import { KanbanConfigHelper } from '../../kanban/helpers/kanbanConfig';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  contactId: {
    type: [Number, String],
    default: null,
  },
  conversationId: {
    type: [Number, String],
    default: null,
  },
  deal: {
    type: Object,
    default: null,
  },
  initialStageId: {
    type: String,
    default: null,
  },
  initialPipelineId: {
    type: [Number, String],
    default: null,
  },
});

const emit = defineEmits(['close', 'saved']);

const store = useStore();
const title = ref('');
const value = ref(0);
const selectedContactId = ref(null);
const selectedUserId = ref(null);
const selectedPipelineId = ref(null);
const selectedStageId = ref(null);
const customAttributes = ref({});
const isSaving = ref(false);

const fullConfig = ref({ pipelines: [] });

// Agents list for Responsável selection
const agents = computed(() => store.getters['agents/getAgents'] || []);

// Contacts list for contact selection when creating deal from Kanban view
const allContacts = computed(() => store.getters['contacts/getContacts'] || []);

const activeContact = computed(() => {
  if (!selectedContactId.value) return null;
  return store.getters['contacts/getContact'](selectedContactId.value) || null;
});

const pipelines = computed(() => fullConfig.value.pipelines || []);
const stages = computed(() => {
  const pipeline = pipelines.value.find(
    p => String(p.id) === String(selectedPipelineId.value)
  );
  return pipeline ? pipeline.stages || [] : [];
});

const dealCustomAttributes = computed(() => {
  const dealAttrs =
    store.getters['attributes/getAttributesByModel']('deal_attribute') || [];
  if (dealAttrs.length > 0) return dealAttrs;
  return (
    store.getters['attributes/getAttributesByModel'](
      'conversation_attribute'
    ) || []
  );
});

const loadKanbanConfig = async () => {
  try {
    const { config } = await KanbanConfigHelper.loadConfig(store);
    fullConfig.value = config;

    selectedContactId.value =
      props.contactId || (props.deal ? props.deal.contact_id : null);
    selectedUserId.value = props.deal
      ? props.deal.user_id || props.deal.user?.id || null
      : null;

    if (props.deal) {
      title.value = props.deal.title || '';
      value.value = props.deal.value || 0;
      selectedPipelineId.value = props.deal.pipeline_id;
      selectedStageId.value = props.deal.stage_id;
      customAttributes.value = { ...(props.deal.custom_attributes || {}) };
    } else {
      value.value = 0;
      customAttributes.value = {};

      // Set initial pipeline & stage
      if (
        props.initialPipelineId &&
        pipelines.value.some(
          p => String(p.id) === String(props.initialPipelineId)
        )
      ) {
        selectedPipelineId.value = props.initialPipelineId;
      } else if (pipelines.value.length > 0) {
        selectedPipelineId.value = pipelines.value[0].id;
      }

      if (
        props.initialStageId &&
        stages.value.some(s => String(s.id) === String(props.initialStageId))
      ) {
        selectedStageId.value = props.initialStageId;
      } else if (stages.value.length > 0) {
        selectedStageId.value = stages.value[0].id;
      }

      // Auto-fill title with Contact name when creating a new deal
      if (activeContact.value && activeContact.value.name) {
        title.value = activeContact.value.name;
      } else if (!title.value) {
        title.value = '';
      }
    }
  } catch (err) {
    // Handle config load error
  }
};

watch(
  () => props.show,
  newShow => {
    if (newShow) {
      loadKanbanConfig();
    }
  }
);

watch(selectedContactId, newContactId => {
  if (newContactId && !props.deal && !title.value) {
    const contact = store.getters['contacts/getContact'](newContactId);
    if (contact && contact.name) {
      title.value = contact.name;
    }
  }
});

watch(selectedPipelineId, newPipelineId => {
  const pipeline = pipelines.value.find(
    p => String(p.id) === String(newPipelineId)
  );
  if (pipeline && pipeline.stages?.length > 0) {
    const stageExists = pipeline.stages.some(
      s => String(s.id) === String(selectedStageId.value)
    );
    if (!stageExists) {
      selectedStageId.value = pipeline.stages[0].id;
    }
  } else {
    selectedStageId.value = null;
  }
});

onMounted(() => {
  store.dispatch('attributes/get');
  store.dispatch('agents/get');
  store.dispatch('contacts/get', 1);
  if (props.show) {
    loadKanbanConfig();
  }
});

const handleClose = () => {
  emit('close');
};

const handleSave = async () => {
  if (!title.value.trim()) {
    useAlert('Por favor, informe o título do negócio.');
    return;
  }
  if (!selectedContactId.value) {
    useAlert('Por favor, selecione ou informe o contato do negócio.');
    return;
  }
  if (!selectedPipelineId.value || !selectedStageId.value) {
    useAlert('Por favor, selecione o funil e a etapa do negócio.');
    return;
  }

  isSaving.value = true;
  try {
    const payload = {
      title: title.value.trim(),
      value: Number(value.value) || 0,
      pipeline_id: String(selectedPipelineId.value),
      stage_id: String(selectedStageId.value),
      contact_id: Number(selectedContactId.value),
      conversation_id: props.conversationId
        ? Number(props.conversationId)
        : null,
      user_id: selectedUserId.value ? Number(selectedUserId.value) : null,
      custom_attributes: customAttributes.value,
    };

    if (props.deal && props.deal.id) {
      await store.dispatch('deals/updateDeal', {
        id: props.deal.id,
        ...payload,
      });
      useAlert('Negócio atualizado com sucesso!');
    } else {
      await store.dispatch('deals/createDeal', payload);
      useAlert('Negócio criado com sucesso!');
    }

    emit('saved');
    emit('close');
  } catch (error) {
    useAlert('Erro ao salvar o negócio. Verifique os dados informados.');
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template -->
  <!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
  <Modal :show="show" @close="handleClose">
    <div class="p-6">
      <div
        class="flex items-center justify-between pb-4 border-b border-n-slate-4"
      >
        <h3 class="text-lg font-semibold text-n-slate-12">
          {{ props.deal ? 'Editar Negócio / CRM' : 'Criar Novo Negócio / CRM' }}
        </h3>
        <button
          class="text-n-slate-10 hover:text-n-slate-12 text-lg font-bold"
          @click="handleClose"
        >
          ✕
        </button>
      </div>

      <div class="flex flex-col gap-4 py-4 max-h-[70vh] overflow-y-auto">
        <!-- Contact Selector (if not pre-set from sidebar) -->
        <div v-if="!props.contactId">
          <label class="block text-xs font-medium text-n-slate-11 mb-1">
            Contato Vinculado *
          </label>
          <select
            v-model="selectedContactId"
            class="w-full h-10 px-3 text-sm rounded-lg bg-n-slate-2 border border-n-slate-5 text-n-slate-12 focus:outline-none"
          >
            <option :value="null" disabled>Selecione um contato...</option>
            <option
              v-for="contact in allContacts"
              :key="contact.id"
              :value="contact.id"
            >
              {{ contact.name }} {{ contact.email ? `(${contact.email})` : '' }}
            </option>
          </select>
        </div>

        <!-- Title Field (Auto-filled with Contact Name, editable) -->
        <div>
          <label class="block text-xs font-medium text-n-slate-11 mb-1">
            Título do Negócio *
          </label>
          <Input
            v-model="title"
            placeholder="Ex: Nome do Contato - Proposta X"
            class="w-full"
          />
        </div>

        <!-- Value Field -->
        <div>
          <label class="block text-xs font-medium text-n-slate-11 mb-1">
            Valor Estimado (R$)
          </label>
          <Input
            v-model="value"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            class="w-full"
          />
        </div>

        <!-- Pipeline Selection -->
        <div>
          <label class="block text-xs font-medium text-n-slate-11 mb-1">
            Funil de Vendas *
          </label>
          <select
            v-model="selectedPipelineId"
            class="w-full h-10 px-3 text-sm rounded-lg bg-n-slate-2 border border-n-slate-5 text-n-slate-12 focus:outline-none"
          >
            <option
              v-for="pipeline in pipelines"
              :key="pipeline.id"
              :value="pipeline.id"
            >
              {{ pipeline.name }}
            </option>
          </select>
        </div>

        <!-- Stage Selection -->
        <div>
          <label class="block text-xs font-medium text-n-slate-11 mb-1">
            Estágio do Funil *
          </label>
          <select
            v-model="selectedStageId"
            class="w-full h-10 px-3 text-sm rounded-lg bg-n-slate-2 border border-n-slate-5 text-n-slate-12 focus:outline-none"
          >
            <option v-for="stage in stages" :key="stage.id" :value="stage.id">
              {{ stage.title || stage.name }}
            </option>
          </select>
        </div>

        <!-- Assignee / Responsável -->
        <div>
          <label class="block text-xs font-medium text-n-slate-11 mb-1">
            Atendente Responsável
          </label>
          <select
            v-model="selectedUserId"
            class="w-full h-10 px-3 text-sm rounded-lg bg-n-slate-2 border border-n-slate-5 text-n-slate-12 focus:outline-none"
          >
            <option :value="null">Nenhum (Não atribuído)</option>
            <option v-for="agent in agents" :key="agent.id" :value="agent.id">
              {{ agent.name }}
            </option>
          </select>
        </div>

        <!-- Deal Custom Attributes -->
        <div
          v-if="dealCustomAttributes.length > 0"
          class="pt-2 border-t border-n-slate-4"
        >
          <h4
            class="text-xs font-semibold text-n-slate-11 uppercase tracking-wider mb-2"
          >
            Campos Personalizados do Negócio
          </h4>
          <div
            v-for="attr in dealCustomAttributes"
            :key="attr.attribute_key"
            class="mb-3"
          >
            <label class="block text-xs font-medium text-n-slate-11 mb-1">
              {{ attr.attribute_display_name }}
            </label>
            <Input
              v-model="customAttributes[attr.attribute_key]"
              :placeholder="
                attr.attribute_description || attr.attribute_display_name
              "
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="flex items-center justify-end gap-3 pt-4 border-t border-n-slate-4"
      >
        <Button transparent color="slate" @click="handleClose">
          Cancelar
        </Button>
        <Button blue :is-loading="isSaving" @click="handleSave">
          {{ props.deal ? 'Salvar Negócio' : 'Criar Negócio' }}
        </Button>
      </div>
    </div>
  </Modal>
</template>
