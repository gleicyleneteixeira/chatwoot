<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'dashboard/composables/store';
import { useAlert } from 'dashboard/composables';
import Modal from 'dashboard/components-next/modal/Modal.vue';
import Button from 'dashboard/components-next/button/Button.vue';
import Input from 'dashboard/components-next/input/Input.vue';
import { KanbanConfigHelper } from '../../../kanban/helpers/kanbanConfig';

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  contactId: {
    type: [Number, String],
    required: true,
  },
  conversationId: {
    type: [Number, String],
    default: null,
  },
  deal: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close', 'saved']);

const store = useStore();
const title = ref('');
const value = ref(0);
const selectedPipelineId = ref(null);
const selectedStageId = ref(null);
const customAttributes = ref({});
const isSaving = ref(false);

const fullConfig = ref({ pipelines: [] });

const pipelines = computed(() => fullConfig.value.pipelines || []);
const stages = computed(() => {
  const pipeline = pipelines.value.find(
    p => String(p.id) === String(selectedPipelineId.value)
  );
  return pipeline ? pipeline.stages || [] : [];
});

const customAttributeDefinitions = computed(() => {
  return store.getters['attributes/getAttributesByModel']('conversation_attribute') || [];
});

const loadKanbanConfig = async () => {
  try {
    const { config } = await KanbanConfigHelper.loadConfig(store);
    fullConfig.value = config;

    if (props.deal) {
      title.value = props.deal.title || '';
      value.value = props.deal.value || 0;
      selectedPipelineId.value = props.deal.pipeline_id;
      selectedStageId.value = props.deal.stage_id;
      customAttributes.value = { ...(props.deal.custom_attributes || {}) };
    } else if (pipelines.value.length > 0) {
      selectedPipelineId.value = pipelines.value[0].id;
      if (pipelines.value[0].stages?.length > 0) {
        selectedStageId.value = pipelines.value[0].stages[0].id;
      }
    }
  } catch (err) {
    // Error loading config
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
  if (!selectedPipelineId.value || !selectedStageId.value) {
    useAlert('Por favor, selecione o funil e o estágio do negócio.');
    return;
  }

  isSaving.value = true;
  try {
    const payload = {
      title: title.value.trim(),
      value: Number(value.value) || 0,
      pipeline_id: String(selectedPipelineId.value),
      stage_id: String(selectedStageId.value),
      contact_id: Number(props.contactId),
      conversation_id: props.conversationId ? Number(props.conversationId) : null,
      custom_attributes: customAttributes.value,
    };

    if (props.deal && props.deal.id) {
      await store.dispatch('deals/updateDeal', { id: props.deal.id, ...payload });
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
  <Modal :show="show" @close="handleClose">
    <div class="p-6">
      <div class="flex items-center justify-between pb-4 border-b border-n-slate-4">
        <h3 class="text-lg font-semibold text-n-slate-12">
          {{ props.deal ? 'Editar Negócio / CRM' : 'Criar Novo Negócio / CRM' }}
        </h3>
        <button
          class="text-n-slate-10 hover:text-n-slate-12"
          @click="handleClose"
        >
          ✕
        </button>
      </div>

      <div class="flex flex-col gap-4 py-4 max-h-[70vh] overflow-y-auto">
        <!-- Title Field -->
        <div>
          <label class="block text-xs font-medium text-n-slate-11 mb-1">
            Nome / Título do Negócio *
          </label>
          <Input
            v-model="title"
            placeholder="Ex: Venda de Licença VIP, Consultoria..."
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
              {{ stage.name }}
            </option>
          </select>
        </div>

        <!-- Custom Attributes -->
        <div v-if="customAttributeDefinitions.length > 0" class="pt-2 border-t border-n-slate-4">
          <h4 class="text-xs font-semibold text-n-slate-11 uppercase tracking-wider mb-2">
            Campos Personalizados
          </h4>
          <div
            v-for="attr in customAttributeDefinitions"
            :key="attr.attribute_key"
            class="mb-3"
          >
            <label class="block text-xs font-medium text-n-slate-11 mb-1">
              {{ attr.attribute_display_name }}
            </label>
            <Input
              v-model="customAttributes[attr.attribute_key]"
              :placeholder="attr.attribute_display_name"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-n-slate-4">
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
