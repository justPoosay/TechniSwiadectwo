from django.contrib.auth import login, logout
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import LoginSerializer, UserSerializer


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(APIView):
    """Sets the csrftoken cookie that the frontend echoes in X-CSRFToken."""

    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs) -> Response:
        return Response(status=status.HTTP_204_NO_CONTENT)


# DRF only enforces CSRF for already authenticated sessions; login needs it too
# to prevent login CSRF.
@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs) -> Response:
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)

        user.last_active_at = timezone.now()
        user.save(update_fields=["last_active_at"])

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs) -> Response:
        logout(request)
        return Response({"detail": "Wylogowano pomyślnie."}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs) -> Response:
        request.user.last_active_at = timezone.now()
        request.user.save(update_fields=["last_active_at"])

        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
