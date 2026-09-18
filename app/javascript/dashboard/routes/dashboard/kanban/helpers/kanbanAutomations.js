/* eslint-disable no-console, no-restricted-syntax, no-continue, no-await-in-loop */
import { KanbanConfigHelper } from './kanbanConfig';

export const triggerStageTypebot = async (conversation, stage) => {
  if (!conversation || !stage) return;
  const typebotUrl = stage.typebot_url || '';
  const typebotId = stage.typebot_id || '';
  if (!typebotUrl || !typebotId) return;

  const baseUrl = typebotUrl.replace(/\/+$/, '');
  const contact = conversation.meta?.sender || {};

  try {
    const response = await fetch(
      `${baseUrl}/api/v1/typebots/${typebotId}/startChat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefilledVariables: {
            name: contact.name || '',
            email: contact.email || '',
            phone_number: contact.phone_number || '',
            conversation_id: String(conversation.display_id || conversation.id),
            inbox_id: String(conversation.inbox_id || ''),
          },
        }),
      }
    );
    if (!response.ok) {
      console.error(
        `Typebot trigger failed: ${response.status} for stage ${stage.id}`,
        await response.text().catch(() => '')
      );
    }
  } catch (err) {
    console.error(`Typebot trigger error for stage ${stage.id}:`, err);
  }
};

const pickOnlineAgent = async (store, pipeline) => {
  const agentsList = pipeline.agents || [];
  const allAgents = store.getters['agents/getAgents'] || [];
  const onlineAgents = allAgents.filter(
    a => a.availability_status === 'online'
  );
  const eligible =
    agentsList.length > 0
      ? onlineAgents.filter(a => agentsList.includes(a.id))
      : onlineAgents;
  if (eligible.length > 0) {
    const agent = eligible[Math.floor(Math.random() * eligible.length)];
    return agent.id;
  }
  return null;
};

const findDealForConversation = (store, conversationId, pipeline) => {
  const deals = store.getters['deals/getAllDeals'] || [];
  return deals.find(
    d =>
      Number(d.conversation_id) === Number(conversationId) &&
      String(d.pipeline_id) === String(pipeline.id)
  );
};

export const KanbanAutomations = {
  register(store) {
    const configPromise = KanbanConfigHelper.loadConfig(store);

    const getConfig = async () => {
      try {
        const result = await configPromise;
        return result.config;
      } catch (err) {
        console.error('Failed to load Kanban config for automations:', err);
        return null;
      }
    };

    const tryAutoCreate = async (conversation, config, isAgentFirstMsg) => {
      if (!conversation || !conversation.id) return;

      for (const pipeline of config.pipelines) {
        if (!pipeline.automations?.auto_create) continue;
        if (isAgentFirstMsg && pipeline.automations?.auto_create_skip_agent)
          continue;

        const hasDeal = findDealForConversation(
          store,
          conversation.id,
          pipeline
        );
        if (hasDeal) continue;

        const stages = pipeline.stages || [];
        if (stages.length === 0) continue;

        const firstStage = stages[0];
        const contact = conversation.meta?.sender || {};

        // Dispara Typebot antes do create para não depender do retorno
        triggerStageTypebot(conversation, firstStage);

        try {
          const agentId = pipeline.automations?.auto_assign_agent
            ? await pickOnlineAgent(store, pipeline)
            : null;

          await store.dispatch('deals/createDeal', {
            title:
              contact.name ||
              `Conversa #${conversation.display_id || conversation.id}`,
            value: 0,
            pipeline_id: String(pipeline.id),
            stage_id: String(firstStage.id),
            contact_id: Number(conversation.contact_id),
            conversation_id: Number(conversation.id),
            user_id: agentId,
          });
        } catch (err) {
          console.error(
            `Automation failed: auto_create deal for conversation #${conversation.id}`,
            err
          );
        }
      }
    };

    const handleAutoWinOnResolve = async (conversationId, config) => {
      if (!conversationId) return;

      for (const pipeline of config.pipelines) {
        if (!pipeline.automations?.auto_win_on_resolve) continue;

        const deal = findDealForConversation(store, conversationId, pipeline);
        if (!deal) continue;

        const wonStage = pipeline.stages.find(s => s.is_won);
        if (!wonStage || String(deal.stage_id) === String(wonStage.id))
          continue;

        try {
          await store.dispatch('deals/updateDeal', {
            id: deal.id,
            stage_id: String(wonStage.id),
            status: 'won',
          });
        } catch (err) {
          console.error(
            `Automation failed: auto_win_on_resolve for conversation #${conversationId}`,
            err
          );
        }
      }
    };

    return store.subscribe(async mutation => {
      const { type, payload } = mutation;

      const config = await getConfig();
      if (!config || !Array.isArray(config.pipelines)) return;

      if (type === 'ADD_CONVERSATION') {
        const conversation = payload;
        if (!conversation || !conversation.id) return;
        if (conversation.status === 'resolved') return;

        const firstMsg =
          conversation.last_non_activity_message || conversation.messages?.[0];
        const isAgentFirstMsg = firstMsg && firstMsg.message_type === 1;

        await tryAutoCreate(conversation, config, isAgentFirstMsg);
      }

      if (type === 'UPDATE_CONVERSATION') {
        const conversation = payload;
        if (!conversation || !conversation.id) return;
        if (conversation.status === 'resolved') return;

        await tryAutoCreate(conversation, config, false);
      }

      if (type === 'CHANGE_CONVERSATION_STATUS') {
        const { conversationId, status } = payload;
        if (status !== 'resolved' || !conversationId) return;

        await handleAutoWinOnResolve(conversationId, config);
      }
    });
  },
};
