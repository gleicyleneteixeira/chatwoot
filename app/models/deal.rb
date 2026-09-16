# == Schema Information
#
# Table name: deals
#
#  id                :bigint           not null, primary key
#  custom_attributes :jsonb            default({})
#  description       :text
#  status            :string           default("open"), not null
#  title             :string           not null
#  value             :decimal(, )      default(0.0)
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#  account_id        :bigint           not null
#  contact_id        :bigint           not null
#  conversation_id   :bigint
#  user_id           :bigint
#
# Indexes
#
#  index_deals_on_account_id                 (account_id)
#  index_deals_on_account_id_and_contact_id  (account_id,contact_id)
#  index_deals_on_account_id_and_status      (account_id,status)
#  index_deals_on_contact_id                 (contact_id)
#  index_deals_on_conversation_id            (conversation_id)
#  index_deals_on_status                     (status)
#  index_deals_on_user_id                    (user_id)
#
class Deal < ApplicationRecord
  belongs_to :account
  belongs_to :contact
  belongs_to :conversation, optional: true
  belongs_to :user, optional: true

  STATUSES = %w[open in_progress won lost].freeze
  validates :title, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }

  scope :active, -> { where(status: %w[open in_progress]) }
  scope :for_contact, ->(contact_id) { where(contact_id: contact_id) }
  scope :for_account, ->(account_id) { where(account_id: account_id) }

  before_validation :set_default_status

  private

  def set_default_status
    self.status ||= 'open'
  end
end
