from django.urls import path

from apps.users.views import CsrfTokenView, CurrentUserView, LoginView, LogoutView

app_name = "users"

urlpatterns = [
    path("auth/csrf/", CsrfTokenView.as_view(), name="csrf"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", CurrentUserView.as_view(), name="current-user"),
]
