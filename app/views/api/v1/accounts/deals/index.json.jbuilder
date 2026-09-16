json.deals @deals do |deal|
  json.id deal.id
  json.title deal.title
  json.value deal.value
  json.status deal.status
  json.description deal.description
  json.custom_attributes deal.custom_attributes
  json.account_id deal.account_id
  json.contact_id deal.contact_id
  json.conversation_id deal.conversation_id
  json.user_id deal.user_id
  json.created_at deal.created_at
  json.updated_at deal.updated_at

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
      json.avatar_url deal.user.avatar_url
    end
  end
end
