json.id deal.id
json.title deal.title
json.value deal.value.to_f
json.formatted_value deal.formatted_value
json.pipeline_id deal.pipeline_id
json.stage_id deal.stage_id
json.status deal.status
json.custom_attributes deal.custom_attributes || {}
json.account_id deal.account_id
json.contact_id deal.contact_id
json.conversation_id deal.conversation_id
json.user_id deal.user_id
json.created_at deal.created_at.to_i
json.updated_at deal.updated_at.to_i

if deal.contact.present?
  json.contact do
    json.id deal.contact.id
    json.name deal.contact.name
    json.email deal.contact.email
    json.phone_number deal.contact.phone_number
    json.thumbnail deal.contact.avatar_url
  end
end

if deal.user.present?
  json.user do
    json.id deal.user.id
    json.name deal.user.name
    json.email deal.user.email
    json.thumbnail deal.user.avatar_url
  end
end

