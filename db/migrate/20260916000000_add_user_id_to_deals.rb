class AddUserIdToDeals < ActiveRecord::Migration[7.0]
  def change
    add_column :deals, :user_id, :bigint
    add_index :deals, :user_id
  end
end
