<script setup>
/* eslint-disable no-console */
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useStore } from 'dashboard/composables/store';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import Thumbnail from 'dashboard/components/widgets/Thumbnail.vue';

const props = defineProps({
  deal: {
    type: Object,
    default: null,
  },
  conversation: {
    type: Object,
    default: () => ({}),
  },
  pipelineAgents: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['edit', 'won', 'assign', 'removePipeline']);

const { t } = useI18n();
const store = useStore();

// Hover state
const isHovered = ref(false);
const showPriorityPopover = ref(false);
const showAssigneePopover = ref(false);
const showMoreMenu = ref(false);
const showDateEditor = ref(false);
const editingDateValue = ref('');

const allAgents = computed(() => store.getters['agents/getAgents'] || []);

const filteredAgents = computed(() => {
  if (props.pipelineAgents.length > 0) {
    return allAgents.value.filter(a => props.pipelineAgents.includes(a.id));
  }
  return allAgents.value;
});

// ---------- Deal data ----------
const dealTitle = computed(() => {
  return (
    props.deal?.title ||
    props.conversation?.group_title ||
    props.conversation?.title ||
    'Negócio sem título'
  );
});

const contactName = computed(() => {
  return (
    props.deal?.contact?.name ||
    props.conversation?.meta?.sender?.name ||
    'Cliente'
  );
});

const contactThumbnail = computed(() => {
  return (
    props.deal?.contact?.thumbnail ||
    props.conversation?.meta?.sender?.thumbnail
  );
});

const dealValueFormatted = computed(() => {
  if (props.deal?.formatted_value) return props.deal.formatted_value;
  if (props.deal?.value !== undefined && props.deal?.value !== null) {
    return `R$ ${Number(props.deal.value).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
    })}`;
  }
  return null;
});

const dealStatusMeta = computed(() => {
  const status = props.deal?.status || 'open';
  switch (status) {
    case 'won':
      return {
        label: 'Ganho',
        class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      };
    case 'lost':
      return {
        label: 'Perdido',
        class: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      };
    case 'in_progress':
      return {
        label: 'Em andamento',
        class: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      };
    default:
      return {
        label: 'Aberto',
        class: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      };
  }
});

const cardCustomAttrDefs = computed(() => {
  const dealDefs =
    store.getters['attributes/getAttributesByModel']('deal_attribute') || [];
  return dealDefs.filter(def => def.show_on_kanban_card === true);
});

const customAttributesEntries = computed(() => {
  const attrs = props.deal?.custom_attributes || {};
  const entries = Object.entries(attrs).filter(
    ([, val]) => val !== null && val !== undefined && val !== ''
  );
  if (cardCustomAttrDefs.value.length === 0) return entries;
  const allowedKeys = cardCustomAttrDefs.value.map(d => d.attribute_key);
  return entries.filter(([key]) => allowedKeys.includes(key));
});

const getCustomAttributeLabel = key => {
  const def = cardCustomAttrDefs.value.find(d => d.attribute_key === key);
  return def ? def.attribute_display_name : key;
};

// ---------- Timestamps ----------
const timeAgo = computed(() => {
  const timeVal = props.deal?.created_at;
  if (!timeVal) return '';
  const date = new Date(timeVal * 1000 || timeVal);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
});

// ---------- Assignee ----------
const assignee = computed(() => {
  const u = props.deal?.user;
  if (u) return u;
  const agent = allAgents.value.find(
    a => Number(a.id) === Number(props.deal?.user_id)
  );
  return agent || null;
});

// ---------- Priority & Due Date (deal custom attributes) ----------
const dealPriority = computed(() => {
  return props.deal?.custom_attributes?.priority || null;
});

const priorityMeta = computed(() => {
  const p = dealPriority.value;
  switch (p) {
    case 'urgent':
      return {
        label: 'Urgente',
        colorClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        icon: 'i-lucide-alert-triangle',
      };
    case 'high':
      return {
        label: 'Alta',
        colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        icon: 'i-lucide-chevron-up',
      };
    case 'medium':
      return {
        label: 'Média',
        colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        icon: 'i-lucide-minus',
      };
    case 'low':
      return {
        label: 'Baixa',
        colorClass: 'bg-slate-500/10 text-slate-400 border-slate-700/30',
        icon: 'i-lucide-chevron-down',
      };
    default:
      return null;
  }
});

const dueDateValue = computed(() => {
  return props.deal?.custom_attributes?.due_date || null;
});

const urgencyMeta = computed(() => {
  const dVal = dueDateValue.value;
  if (!dVal) return null;

  const dueDate = new Date(dVal);
  const today = new Date();
  const dDate = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate()
  );
  const tDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const diffDays = Math.floor((dDate - tDate) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'overdue',
      label: 'Vencido',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      borderClass: 'border-rose-500/40 bg-rose-500/[0.02]',
      text: 'Vencido',
    };
  }
  if (diffDays === 0) {
    return {
      status: 'today',
      label: 'Hoje',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      borderClass: 'border-amber-500/40 bg-amber-500/[0.02]',
      text: 'Hoje',
    };
  }
  return {
    status: 'future',
    label: dueDate.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    }),
    badgeClass: 'bg-slate-800 text-slate-400 border-slate-700/50',
    borderClass: 'border-slate-800',
    text: dueDate.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
    }),
  };
});

// ---------- Actions ----------
const updateCustomAttributes = async customAttributes => {
  if (!props.deal?.id) return;
  const current = { ...(props.deal.custom_attributes || {}) };
  try {
    await store.dispatch('deals/updateDeal', {
      id: props.deal.id,
      custom_attributes: { ...current, ...customAttributes },
    });
  } catch (err) {
    console.error('Failed to update deal custom attributes:', err);
  }
};

const updatePriority = async p => {
  showPriorityPopover.value = false;
  const payload = { priority: p };
  if (!p) delete payload.priority;
  await updateCustomAttributes(payload);
};

const startEditDate = e => {
  e.stopPropagation();
  const dVal = dueDateValue.value;
  editingDateValue.value = dVal
    ? new Date(dVal).toISOString().split('T')[0]
    : '';
  showDateEditor.value = true;
};

const saveDate = async () => {
  const dVal = editingDateValue.value;
  const payload = {};
  if (dVal) {
    const localDate = new Date(dVal + 'T00:00:00');
    payload.due_date = localDate.toISOString();
  } else {
    payload.due_date = null;
  }
  await updateCustomAttributes(payload);
  showDateEditor.value = false;
};

const handleAssign = (e, agentId) => {
  e.stopPropagation();
  showAssigneePopover.value = false;
  emit('assign', { dealId: props.deal?.id, agentId });
};

const handleRemovePipeline = e => {
  e.stopPropagation();
  showMoreMenu.value = false;
  emit('removePipeline', props.deal?.id);
};

const handleWon = e => {
  e.stopPropagation();
  emit('won', props.deal?.id);
};

const handleEdit = () => {
  if (props.deal?.id) {
    emit('edit', props.deal);
  }
};

const router = useRouter();
const route = useRoute();

const navigateToConversation = () => {
  const accountId =
    route.params.accountId ||
    props.deal?.account_id ||
    props.conversation?.account_id ||
    store.getters.getCurrentAccountId;

  const convId = props.deal?.conversation_id || props.conversation?.id;
  if (convId) {
    router
      .push({
        name: 'inbox_conversation',
        params: { accountId, conversation_id: convId },
      })
      .catch(() => {
        router.push(`/app/accounts/${accountId}/conversations/${convId}`);
      });
  }
};

// Popover closing click outside
const handleDocumentClick = e => {
  if (
    showPriorityPopover.value &&
    !e.target.closest('.priority-popover-trigger')
  ) {
    showPriorityPopover.value = false;
  }
  if (
    showAssigneePopover.value &&
    !e.target.closest('.assignee-popover-trigger')
  ) {
    showAssigneePopover.value = false;
  }
  if (showMoreMenu.value && !e.target.closest('.more-menu-trigger')) {
    showMoreMenu.value = false;
  }
  if (showDateEditor.value && !e.target.closest('.date-editor-trigger')) {
    showDateEditor.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <!-- eslint-disable vue/no-bare-strings-in-template -->
  <!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
  <div
    class="group relative flex flex-col p-3.5 rounded-xl border bg-slate-900 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:cursor-grabbing"
    :class="
      urgencyMeta ? urgencyMeta.borderClass : 'border-slate-850 bg-slate-900/90'
    "
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleEdit"
  >
    <!-- Hover Tooltip Context Preview -->
    <div
      v-if="isHovered && customAttributesEntries.length > 0"
      class="absolute left-0 right-0 -bottom-2 translate-y-full z-40 bg-slate-950 border border-slate-750 shadow-2xl rounded-xl p-3 text-slate-100 text-xs animate-in fade-in slide-in-from-top-1 pointer-events-none"
    >
      <div
        class="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5"
      >
        <span class="font-bold text-slate-100 truncate max-w-[200px]">{{
          dealTitle
        }}</span>
        <span v-if="dealValueFormatted" class="font-bold text-emerald-400">{{
          dealValueFormatted
        }}</span>
      </div>
      <div class="text-[11px] text-slate-300 leading-relaxed">
        <div class="space-y-0.5">
          <span
            v-for="[k, v] in customAttributesEntries"
            :key="k"
            class="block text-[10px]"
          >
            <strong class="text-slate-400">
              {{ getCustomAttributeLabel(k) }}:
            </strong>
            {{ v }}
          </span>
        </div>
      </div>
    </div>

    <!-- Drag Indicator (grip dots, top-left) -->
    <div
      class="absolute top-2 left-2 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
    >
      <Icon icon="i-lucide-grip-vertical" class="size-3.5" />
    </div>

    <!-- Card Header: Deal Title & Value -->
    <div class="flex items-start justify-between w-full gap-2 pl-4">
      <div class="flex flex-col min-w-0">
        <span class="text-sm font-bold text-slate-100 truncate">
          {{ dealTitle }}
        </span>

        <div class="flex items-center gap-2 mt-1">
          <Thumbnail
            :src="contactThumbnail"
            :username="contactName"
            size="20px"
            class="shrink-0 rounded-full"
          />
          <span class="text-xs text-slate-300 truncate">
            {{ contactName }}
          </span>
        </div>
      </div>

      <div class="flex flex-col items-end gap-1 shrink-0">
        <span
          v-if="dealValueFormatted"
          class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        >
          {{ dealValueFormatted }}
        </span>
        <span
          class="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
          :class="dealStatusMeta.class"
        >
          {{ dealStatusMeta.label }}
        </span>
      </div>
    </div>

    <!-- Custom Attributes -->
    <div
      v-if="customAttributesEntries.length > 0"
      class="flex flex-wrap gap-1 mt-2.5 pl-4"
    >
      <span
        v-for="[key, val] in customAttributesEntries"
        :key="key"
        class="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-800 text-slate-300 border border-slate-700/50"
      >
        {{ getCustomAttributeLabel(key) }}: {{ val }}
      </span>
    </div>

    <!-- Shortcut to Conversation + Footer info -->
    <div
      class="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/40 pl-4"
    >
      <!-- Left: due date & priority badges -->
      <div class="flex items-center gap-1.5 min-w-0">
        <div class="relative date-editor-trigger">
          <span
            v-if="urgencyMeta"
            :class="[urgencyMeta.badgeClass]"
            class="px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            @click.stop="startEditDate"
          >
            {{ urgencyMeta.label }}
          </span>

          <!-- Inline date editor popover -->
          <div
            v-if="showDateEditor"
            class="absolute bottom-7 left-0 flex flex-col gap-1.5 bg-slate-900 border border-slate-800 shadow-xl rounded-lg p-2 z-30 min-w-[180px] animate-in fade-in slide-in-from-top-1"
            @click.stop
          >
            <input
              v-model="editingDateValue"
              type="date"
              class="w-full px-2 py-1 rounded border border-slate-700 bg-slate-950 text-slate-200 text-xs outline-none"
            />
            <div class="flex gap-1.5 justify-end">
              <button
                type="button"
                class="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                @click.stop="showDateEditor = false"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                @click.stop="saveDate"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>

        <!-- Priority Badge -->
        <span
          v-if="priorityMeta"
          :class="[priorityMeta.colorClass]"
          class="px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 shrink-0"
        >
          <Icon :icon="priorityMeta.icon" class="size-3 shrink-0" />
          {{ priorityMeta.label }}
        </span>

        <span
          v-if="timeAgo"
          class="text-[10px] font-semibold text-slate-500 truncate"
          title="Criado recentemente"
        >
          {{ timeAgo }}
        </span>
      </div>

      <!-- Right: conversation shortcut + assignee -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          v-if="props.deal?.conversation_id || props.conversation?.id"
          type="button"
          class="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors cursor-pointer"
          title="Abrir conversa no Chatwoot"
          @click.stop="navigateToConversation"
        >
          <Icon icon="i-lucide-message-square" class="size-3" />
          <span>Conversa</span>
        </button>

        <!-- Assignee Thumbnail -->
        <div class="relative assignee-popover-trigger">
          <div
            class="cursor-pointer"
            @click.stop="showAssigneePopover = !showAssigneePopover"
          >
            <Thumbnail
              v-if="assignee"
              :src="assignee.thumbnail || assignee.avatar_url || ''"
              :username="assignee.name || 'Agente'"
              size="22px"
              class="shrink-0 ring-2 ring-slate-950 rounded-full"
              :title="assignee.name"
            />
            <!-- Unassigned Placeholder -->
            <div
              v-else
              class="size-[22px] rounded-full bg-slate-950 flex items-center justify-center border border-dashed border-slate-700 shrink-0 cursor-pointer hover:border-slate-500 transition-colors"
              :title="t('KANBAN.CARD.NO_ASSIGNEE')"
            >
              <Icon icon="i-lucide-user-round" class="text-slate-600 size-3" />
            </div>
          </div>

          <!-- Assignee popover -->
          <div
            v-if="showAssigneePopover"
            class="absolute bottom-7 right-0 flex flex-col min-w-[140px] bg-slate-900 border border-slate-800 shadow-xl rounded-lg overflow-hidden py-1 z-30 animate-in fade-in slide-in-from-bottom-1"
          >
            <div
              class="px-3 py-1.5 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500"
            >
              Atribuir para
            </div>
            <button
              v-for="agent in filteredAgents"
              :key="agent.id"
              type="button"
              class="px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
              :class="{
                'bg-emerald-500/10': Number(assignee?.id) === Number(agent.id),
              }"
              @click="handleAssign($event, agent.id)"
            >
              <Thumbnail
                :src="agent.thumbnail"
                :username="agent.name"
                size="16px"
                class="shrink-0 rounded-full"
              />
              <span class="truncate">{{ agent.name }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hover Actions (Overlay) -->
    <div
      v-if="isHovered"
      class="absolute top-2 right-2 flex items-center gap-1.5 bg-slate-900 border border-slate-700 shadow-md px-1.5 py-1 rounded-lg z-20 transition-all duration-150"
      @click.stop
    >
      <!-- Quick Priority Selector trigger -->
      <div class="relative priority-popover-trigger">
        <button
          type="button"
          class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title="Alterar prioridade"
          @click.stop="showPriorityPopover = !showPriorityPopover"
        >
          <Icon icon="i-lucide-flag" class="size-3.5" />
        </button>

        <!-- Popover list -->
        <div
          v-if="showPriorityPopover"
          class="absolute top-7 right-0 flex flex-col min-w-[100px] bg-slate-900 border border-slate-800 shadow-xl rounded-lg overflow-hidden py-1 z-30 animate-in fade-in slide-in-from-top-1"
        >
          <button
            type="button"
            class="px-3 py-1.5 text-xs text-left font-medium text-rose-400 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            @click="updatePriority('urgent')"
          >
            <Icon icon="i-lucide-alert-triangle" class="size-3" />
            Urgente
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs text-left font-medium text-amber-400 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            @click="updatePriority('high')"
          >
            <Icon icon="i-lucide-chevron-up" class="size-3" />
            Alta
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs text-left font-medium text-blue-400 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            @click="updatePriority('medium')"
          >
            <Icon icon="i-lucide-minus" class="size-3" />
            Média
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs text-left font-medium text-slate-400 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            @click="updatePriority('low')"
          >
            <Icon icon="i-lucide-chevron-down" class="size-3" />
            Baixa
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs text-left font-medium text-slate-500 hover:bg-slate-800 border-t border-slate-850 transition-colors"
            @click="updatePriority(null)"
          >
            Nenhuma
          </button>
        </div>
      </div>

      <!-- Conclude (win) quick action -->
      <button
        type="button"
        class="p-1 hover:bg-emerald-500/10 rounded text-slate-400 hover:text-emerald-400 transition-colors"
        title="Marcar como ganho"
        @click.stop="handleWon"
      >
        <Icon icon="i-lucide-check" class="size-3.5" />
      </button>

      <!-- "..." More options menu -->
      <div class="relative more-menu-trigger">
        <button
          type="button"
          class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
          title="Mais opções"
          @click.stop="showMoreMenu = !showMoreMenu"
        >
          <Icon icon="i-lucide-more-horizontal" class="size-3.5" />
        </button>

        <div
          v-if="showMoreMenu"
          class="absolute top-7 right-0 flex flex-col min-w-[150px] bg-slate-900 border border-slate-800 shadow-xl rounded-lg overflow-hidden py-1 z-30 animate-in fade-in slide-in-from-top-1"
        >
          <button
            type="button"
            class="px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            @click.stop="handleEdit"
          >
            <Icon icon="i-lucide-pencil" class="size-3 text-slate-400" />
            Editar negócio
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            @click.stop="handleRemovePipeline"
          >
            <Icon icon="i-lucide-trash-2" class="size-3 text-rose-400" />
            Remover do funil
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
