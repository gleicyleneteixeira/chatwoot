class Deal < ApplicationRecord
  belongs_to :account
  belongs_to :contact
  belongs_to :conversation, optional: true
  belongs_to :user, optional: true

  validates :title, presence: true
  validates :account_id, presence: true
  validates :contact_id, presence: true
  validates :stage_id, presence: true
  validates :pipeline_id, presence: true

  scope :by_account, ->(account_id) { where(account_id: account_id) }
  scope :by_contact, ->(contact_id) { where(contact_id: contact_id) if contact_id.present? }
  scope :by_pipeline, ->(pipeline_id) { where(pipeline_id: pipeline_id) if pipeline_id.present? }
  scope :by_stage, ->(stage_id) { where(stage_id: stage_id) if stage_id.present? }
  scope :by_status, ->(status) { where(status: status) if status.present? }
  scope :active, -> { where(status: ['open', 'in_progress']) }

  def formatted_value
    # Format value in Brazilian Real (R$)
    "R$ #{'%.2f' % (value || 0.0)}"
  end
end

