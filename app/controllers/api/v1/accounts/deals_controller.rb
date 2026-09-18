class Api::V1::Accounts::DealsController < Api::V1::Accounts::BaseController
  before_action :fetch_deal, only: [:show, :update, :destroy]

  def index
    scope = Current.account.deals
                           .by_contact(params[:contact_id])
                           .by_pipeline(params[:pipeline_id])
                           .by_stage(params[:stage_id])

    if params[:status] == 'active'
      scope = scope.active
    elsif params[:status].present?
      scope = scope.by_status(params[:status])
    end

    @deals = scope.order(created_at: :desc)
    render 'api/v1/accounts/deals/index', format: :json
  end

  def show
    render 'api/v1/accounts/deals/show', format: :json
  end

  def create
    @deal = Current.account.deals.build(deal_params)
    if @deal.save
      render 'api/v1/accounts/deals/show', status: :created, format: :json
    else
      render json: { errors: @deal.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @deal.update(deal_params)
      render 'api/v1/accounts/deals/show', format: :json
    else
      render json: { errors: @deal.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @deal.destroy!
    head :no_content
  end

  private

  def fetch_deal
    @deal = Current.account.deals.find(params[:id])
  end

  def deal_params
    params.permit(
      :title,
      :value,
      :pipeline_id,
      :stage_id,
      :contact_id,
      :conversation_id,
      :user_id,
      :status,
      custom_attributes: {}
    )
  end
end
