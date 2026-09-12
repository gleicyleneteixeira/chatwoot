<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';
import { useAlert } from 'dashboard/composables';
import SectionLayout from './SectionLayout.vue';

const { t } = useI18n();
const selectedMode = ref('separate_tabs');
const { currentAccount, updateAccount } = useAccount();

const viewModes = [
  { value: 'separate_tabs', label: 'Separate Tabs' },
  { value: 'unified_list', label: 'Unified List with Separator' },
];

watch(
  currentAccount,
  () => {
    selectedMode.value =
      currentAccount.value?.settings?.conversation_list_view_mode ||
      'separate_tabs';
  },
  { deep: true, immediate: true }
);

const updatePreference = async () => {
  try {
    await updateAccount({
      conversation_list_view_mode: selectedMode.value,
    });
    useAlert(t('GENERAL_SETTINGS.FORM.CONVERSATION_LIST_VIEW_MODE.API.SUCCESS'));
  } catch (error) {
    useAlert(t('GENERAL_SETTINGS.FORM.CONVERSATION_LIST_VIEW_MODE.API.ERROR'));
  }
};
</script>

<template>
  <SectionLayout
    :title="t('GENERAL_SETTINGS.FORM.CONVERSATION_LIST_VIEW_MODE.TITLE')"
    :description="t('GENERAL_SETTINGS.FORM.CONVERSATION_LIST_VIEW_MODE.DESCRIPTION')"
    with-border
  >
    <template #headerActions>
      <div class="flex justify-end">
        <select
          v-model="selectedMode"
          class="rounded-md border border-n-weak bg-white px-3 py-1.5 text-sm text-n-slate-12 focus:border-n-brand focus:outline-none focus:ring-1 focus:ring-n-brand"
          @change="updatePreference"
        >
          <option
            v-for="mode in viewModes"
            :key="mode.value"
            :value="mode.value"
          >
            {{ mode.label }}
          </option>
        </select>
      </div>
    </template>
  </SectionLayout>
</template>
