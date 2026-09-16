class CreateDeals < ActiveRecord::Migration[7.0]
  def change
    create_table :deals do |t|
      t.string :title, null: false
      t.decimal :value, precision: 15, scale: 2, default: 0
      t.string :status, default: 'open', null: false
      t.text :description
      t.jsonb :custom_attributes, default: {}
      t.references :account, null: false, foreign_key: true
      t.references :contact, null: false, foreign_key: true
      t.references :conversation, foreign_key: true
      t.references :user, foreign_key: true
      t.timestamps
    end

    add_index :deals, :status
    add_index :deals, [:account_id, :contact_id]
    add_index :deals, [:account_id, :status]
  end
end
