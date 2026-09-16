class AddDisplayFlagsToCustomAttributeDefinitions < ActiveRecord::Migration[7.0]
  def change
    add_column :custom_attribute_definitions, :show_on_kanban_card, :boolean, default: false
    add_column :custom_attribute_definitions, :show_on_sidebar, :boolean, default: false
  end
end
