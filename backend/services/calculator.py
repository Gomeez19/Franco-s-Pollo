import math
from backend.schemas import (
    BreedingCalcInputs, BreedingCalcResults,
    CommercialCalcInputs, CommercialCalcResults
)

def calculate_breeding(data: BreedingCalcInputs) -> BreedingCalcResults:
    # 1. Mortality calculation
    mortality_count = int(math.floor(data.chickens_count * (data.mortality_rate_percent / 100.0)))
    chickens_surviving = max(1, data.chickens_count - mortality_count)

    # 2. Total costs
    initial_birds_cost = data.chickens_count * data.initial_price_per_chicken
    feed_total_cost = data.feed_consumed_kg * data.feed_price_per_kg
    health_cost = data.medications_cost + data.vitamins_cost + data.vaccines_cost
    operational_cost = data.labor_cost + data.utilities_cost + data.transport_cost + data.other_expenses

    total_investment = initial_birds_cost + feed_total_cost + health_cost + operational_cost

    # 3. Unit costs
    cost_per_surviving_chicken = total_investment / chickens_surviving
    total_biomass_kg = chickens_surviving * data.final_avg_weight_kg
    cost_per_kg = total_investment / total_biomass_kg if total_biomass_kg > 0 else 0.0
    cost_per_lb = cost_per_kg / 2.20462 if cost_per_kg > 0 else 0.0

    # 4. Target prices
    margin = data.target_margin_percent / 100.0
    # Price based on margin on cost or sale
    # Let's provide standard markup: price = cost * (1 + margin)
    recommended_price_per_chicken = cost_per_surviving_chicken * (1 + margin)
    recommended_price_per_kg = cost_per_kg * (1 + margin)
    recommended_price_per_lb = recommended_price_per_kg / 2.20462

    estimated_revenue = recommended_price_per_chicken * chickens_surviving
    estimated_profit = estimated_revenue - total_investment
    profit_margin_percent = (estimated_profit / estimated_revenue * 100.0) if estimated_revenue > 0 else 0.0

    return BreedingCalcResults(
        chickens_surviving=chickens_surviving,
        mortality_count=mortality_count,
        total_investment=round(total_investment, 2),
        cost_per_surviving_chicken=round(cost_per_surviving_chicken, 2),
        total_biomass_kg=round(total_biomass_kg, 2),
        cost_per_kg=round(cost_per_kg, 2),
        cost_per_lb=round(cost_per_lb, 2),
        min_selling_price_total=round(total_investment, 2),
        recommended_price_per_kg=round(recommended_price_per_kg, 2),
        recommended_price_per_lb=round(recommended_price_per_lb, 2),
        recommended_price_per_chicken=round(recommended_price_per_chicken, 2),
        estimated_revenue=round(estimated_revenue, 2),
        estimated_profit=round(estimated_profit, 2),
        profit_margin_percent=round(profit_margin_percent, 2)
    )

def calculate_commercial(data: CommercialCalcInputs) -> CommercialCalcResults:
    # 1. Costs
    total_purchase_cost = data.chickens_bought * data.purchase_price_per_unit
    additional_expenses = (
        data.transport_cost +
        data.processing_cost +
        data.packaging_cost +
        data.labor_cost +
        data.other_expenses
    )
    total_cost = total_purchase_cost + additional_expenses
    total_weight_kg = data.chickens_bought * data.avg_weight_kg

    cost_per_chicken = total_cost / data.chickens_bought
    cost_per_kg = total_cost / total_weight_kg if total_weight_kg > 0 else 0.0
    cost_per_lb = cost_per_kg / 2.20462 if cost_per_kg > 0 else 0.0

    margin_rate = data.desired_margin_percent / 100.0

    # Margin on sale: Price = Cost / (1 - Margin)
    # Markup on cost: Price = Cost * (1 + Margin)
    if data.margin_type == "margin_on_sale":
        divisor = max(0.01, 1.0 - margin_rate)
        recommended_price_per_chicken = cost_per_chicken / divisor
        recommended_price_per_kg = cost_per_kg / divisor
    else:  # markup_on_cost
        recommended_price_per_chicken = cost_per_chicken * (1.0 + margin_rate)
        recommended_price_per_kg = cost_per_kg * (1.0 + margin_rate)

    recommended_price_per_lb = recommended_price_per_kg / 2.20462

    total_expected_revenue = recommended_price_per_chicken * data.chickens_bought
    total_profit = total_expected_revenue - total_cost
    profit_per_chicken = total_profit / data.chickens_bought
    profit_margin_percent = (total_profit / total_expected_revenue * 100.0) if total_expected_revenue > 0 else 0.0

    return CommercialCalcResults(
        total_purchase_cost=round(total_purchase_cost, 2),
        additional_expenses=round(additional_expenses, 2),
        total_cost=round(total_cost, 2),
        cost_per_chicken=round(cost_per_chicken, 2),
        cost_per_kg=round(cost_per_kg, 2),
        cost_per_lb=round(cost_per_lb, 2),
        min_selling_price_total=round(total_cost, 2),
        min_selling_price_per_kg=round(cost_per_kg, 2),
        min_selling_price_per_lb=round(cost_per_lb, 2),
        recommended_price_per_chicken=round(recommended_price_per_chicken, 2),
        recommended_price_per_kg=round(recommended_price_per_kg, 2),
        recommended_price_per_lb=round(recommended_price_per_lb, 2),
        profit_per_chicken=round(profit_per_chicken, 2),
        total_expected_revenue=round(total_expected_revenue, 2),
        total_profit=round(total_profit, 2),
        profit_margin_percent=round(profit_margin_percent, 2)
    )
