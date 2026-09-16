class Api::V1::Accounts::DealsController < Api::V1::Accounts::BaseController
  before_action :check_authorization
  before_action :fetch_deal, only: [:show, :update, :destroy]

  def index
    @deals = Current.account.deals
    @deals = @deals.where(contact_id: params[:contact_id]) if params[:contact_id].present?
    @deals = @deals.where(status: params[:status]) if params[:status].present?
    @deals = @deals.where(user_id: params[:user_id]) if params[:user_id].present?
    @deals = @deals.order(updated_at: :desc)
  end

  def show; end

  def create
    @deal = Current.account.deals.new(deal_params)
    if @deal.save
      render :show, status: :created
    else
      render json: { errors: @deal.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @deal.update(deal_params)
      render :show
    else
      render json: { errors: @deal.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @deal.destroy
    head :no_content
  end

  private

  def fetch_deal
    @deal = Current.account.deals.find(params[:id])
  end

  def deal_params
    params.require(:deal).permit(
      :title, :value, :status, :description,
      :contact_id, :conversation_id, :user_id,
      custom_attributes: {}
    )
  end
end
