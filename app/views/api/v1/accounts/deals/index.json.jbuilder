json.array! @deals do |deal|
  json.partial! 'api/v1/accounts/deals/deal', deal: deal
end
