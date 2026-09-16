<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Icon from 'dashboard/components-next/icon/Icon.vue';
import Button from 'dashboard/components-next/button/Button.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  conversation: {
    type: Object,
    required: true,
  },
  targetStage: {
    type: Object,
    required: true,
  },
  pipeline: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['confirm-send', 'move-only', 'cancel']);

const { t } = useI18n();

const messageText = ref('');
const sendWhatsApp = ref(true);

const processTemplate = (template, conversation, deal) => {
  if (!template) return '';
  let text = template;
  const contact = conversation.meta?.sender || {};
  text = text.replace(/\{\{\s*contact\.first_name\s*\}\}/g, contact.name?.split(' ')[0] || '');
  text = text.replace(/\{\{\s*contact\.name\s*\}\}/g, contact.name || '');
  text = text.replace(/\{\{\s*deal\.title\s*\}\}/g, deal?.title || '');
  text = text.replace(/\{\{\s*deal\.value\s*\}\}/g, deal?.value ? `R$ ${Number(deal.value).toLocaleString('pt-BR')}` : '');
  if (deal?.custom_attributes) {
    text = text.replace(
      /\{\{\s*deal\.custom_attributes\.(\w+)\s*\}\}/g,
      (_, key) => deal.custom_attributes[key] || ''
    );
  }
  return text;
};

onMounted(() => {
  const automationMessage = props.targetStage?.automation_message || '';
  messageText.value = processTemplate(
    automationMessage,
    props.conversation,
    null
  );
});

const handleConfirmSend = () => {
  emit('confirm-send', {
    message: messageText.value,
    sendWhatsApp: sendWhatsApp.value,
  });
};

const handleMoveOnly = () => {
  emit('move-only');
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
  >
    <div
      class="flex flex-col w-full max-w-lg border bg-slate-900 border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-slate-800"
      >
        <h3 class="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Icon icon="i-lucide-message-circle" class="text-blue-500 size-5" />
          {{ t('DEAL.AUTOMATION.TITLE') || 'Automação de Mensagem' }}
        </h3>
        <button
          type="button"
          class="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          @click="handleCancel"
        >
          <Icon icon="i-lucide-x" class="size-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <!-- Stage Info -->
        <div class="flex items-center gap-2 p-3 rounded-lg bg-slate-950/50 border border-slate-800">
          <span
            class="size-3 rounded-full shrink-0"
            :style="{ backgroundColor: targetStage.color || '#3b82f6' }"
          />
          <span class="text-xs font-semibold text-slate-200">
            {{ t('DEAL.AUTOMATION.MOVING_TO') || 'Movendo para:' }}
            {{ targetStage.title }}
          </span>
        </div>

        <!-- Message Preview -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-slate-300">
              {{ t('DEAL.AUTOMATION.MESSAGE') || 'Mensagem' }}
            </label>
            <span class="text-[9px] text-slate-500">
              {{ t('DEAL.AUTOMATION.EDITABLE') || 'Editável' }}
            </span>
          </div>
          <textarea
            v-model="messageText"
            rows="5"
            class="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-sm focus:border-blue-500 outline-none resize-none font-mono"
          />
        </div>

        <!-- WhatsApp Toggle -->
        <div class="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-950/50">
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="sendWhatsApp"
              type="checkbox"
              class="sr-only peer"
            />
            <div
              class="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"
            />
          </label>
          <span class="text-xs font-semibold text-slate-200">
            {{ t('DEAL.AUTOMATION.WHATSAPP') || 'Enviar mensagem no WhatsApp do cliente' }}
          </span>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40"
      >
        <Button
          md
          class="border border-slate-700 hover:bg-slate-800 text-slate-300"
          @click="handleCancel"
        >
          {{ t('DEAL.AUTOMATION.CANCEL') || 'Cancelar' }}
        </Button>
        <div class="flex items-center gap-2">
          <Button
            md
            class="border border-slate-700 hover:bg-slate-800 text-slate-300"
            @click="handleMoveOnly"
          >
            {{ t('DEAL.AUTOMATION.MOVE_ONLY') || 'Apenas Mover Card' }}
          </Button>
          <Button
            md
            blue
            solid
            @click="handleConfirmSend"
          >
            <Icon icon="i-lucide-send" class="size-4" />
            {{ t('DEAL.AUTOMATION.CONFIRM_SEND') || 'Confirmar e Enviar' }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
