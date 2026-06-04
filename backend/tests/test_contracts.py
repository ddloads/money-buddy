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
