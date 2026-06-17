from app.core.security import hash_password, verify_password
from app.main import app
from app.schemas.auth import Token
from app.schemas.bill import BillBase, BillRead, BillUpdate
from app.schemas.user import UserRead


def test_hash_password_accepts_normal_password():
    password = "TestPassword123!"

    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed)


def test_dashboard_split_endpoints_exist_for_frontend_contract():
    paths = {route.path for route in app.routes}

    assert "/dashboard/summary" in paths
    assert "/dashboard/upcoming" in paths
    assert "/dashboard/monthly" in paths


def test_dashboard_paycheck_and_debt_endpoints_exist_for_frontend_contract():
    paths = {route.path for route in app.routes}

    assert "/dashboard/paycheck-plan" in paths
    assert "/dashboard/debt" in paths


def test_paycheck_planner_helpers_bucket_paydays_correctly():
    from datetime import date

    from app.api.dashboard import _paydays_in_window, _period_boundaries
    from app.models.income import IncomeFrequency

    today = date(2026, 6, 17)
    bounds = _period_boundaries(date(2026, 1, 2), IncomeFrequency.BIWEEKLY, today, 3)

    # The current period must bracket today.
    assert bounds[0] <= today < bounds[1]
    # A biweekly source pays exactly once per biweekly period.
    for i in range(3):
        assert _paydays_in_window(
            date(2026, 1, 2), IncomeFrequency.BIWEEKLY, bounds[i], bounds[i + 1]
        ) == 1
    # A monthly source pays at most once inside a biweekly window.
    assert _paydays_in_window(
        date(2026, 6, 1), IncomeFrequency.MONTHLY, bounds[0], bounds[1]
    ) <= 1


def test_amortize_helper_handles_payable_and_unpayable_balances():
    from app.services.payoff import amortize

    payable = amortize(1000.0, 100.0, 12.0)
    assert payable["payable"] is True
    assert payable["months_remaining"] and payable["months_remaining"] > 0

    # A payment smaller than the monthly interest can never clear the balance.
    unpayable = amortize(1000.0, 5.0, 24.0)
    assert unpayable["payable"] is False
    assert unpayable["months_remaining"] is None


def test_token_response_contains_user_for_frontend_auth_store():
    fields = set(Token.model_fields)

    assert {"access_token", "token_type", "user"}.issubset(fields)
    assert Token.model_fields["user"].annotation is UserRead


def test_auth_204_routes_declare_empty_responses():
    auth_204_routes = [
        route
        for route in app.routes
        if route.path in {"/auth/me/password", "/auth/me"}
        and route.status_code == 204
    ]

    route_index = {(route.path, tuple(sorted(route.methods))): route for route in auth_204_routes}

    password_route = route_index[("/auth/me/password", ("PUT",))]
    delete_me_route = route_index[("/auth/me", ("DELETE",))]

    assert password_route.response_model is None
    assert delete_me_route.response_model is None


def test_google_auth_status_endpoint_exists_for_frontend_contract():
    route_index = {
        (route.path, tuple(sorted(route.methods))): route
        for route in app.routes
        if getattr(route, "methods", None)
    }

    assert ("/auth/google/status", ("GET",)) in route_index


def test_bill_contract_supports_autopay_flag():
    assert "autopay_enabled" in BillBase.model_fields
    assert "autopay_enabled" in BillUpdate.model_fields
    assert "autopay_enabled" in BillRead.model_fields
    assert BillBase.model_fields["autopay_enabled"].default is False


def test_bill_mutations_refresh_server_managed_columns_before_serialization():
    route_sources = {
        route.name: route.endpoint.__code__.co_names
        for route in app.routes
        if route.path in {
            "/bills",
            "/bills/{bill_id}",
            "/bills/{bill_id}/pay",
            "/bills/{bill_id}/unpay",
        }
    }

    for route_name in {"create_bill", "update_bill", "mark_bill_paid", "mark_bill_unpaid"}:
        assert route_name in route_sources
        assert "refresh" in route_sources[route_name]


def test_categories_route_backfills_default_categories_for_legacy_users():
    route_sources = {
        route.name: route.endpoint.__code__.co_names
        for route in app.routes
        if route.path == "/categories"
    }

    assert "list_categories" in route_sources
    assert "ensure_default_categories" in route_sources["list_categories"]
