class CreateDeals < ActiveRecord::Migration[7.0]
  def change
    create_table :deals do |t|
      t.bigint :account_id, null: false
      t.bigint :contact_id, null: false
      t.bigint :conversation_id
      t.string :title, null: false
      t.decimal :value, precision: 12, scale: 2, default: 0.0
      t.string :pipeline_id, null: false
      t.string :stage_id, null: false
      t.string :status, default: 'open'
      t.jsonb :custom_attributes, default: {}

      t.timestamps
    end

    add_index :deals, :account_id
    add_index :deals, :contact_id
    add_index :deals, :conversation_id
    add_index :deals, [:account_id, :pipeline_id]
    add_index :deals, [:account_id, :stage_id]
  end
end
