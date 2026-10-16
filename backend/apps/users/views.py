from django.contrib.auth import login, logout
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import LoginSerializer, UserSerializer

MessageSerializer = inline_serializer(
    "Message", fields={"detail": serializers.CharField()}
)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(APIView):
    """Sets the csrftoken cookie that the frontend echoes in X-CSRFToken."""

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["auth"],
        summary="Pobierz token CSRF",
        description="Ustawia cookie `csrftoken`, którego wartość należy odsyłać "
        "w nagłówku `X-CSRFToken` przy żądaniach POST/PUT/PATCH/DELETE.",
        responses={204: OpenApiResponse(description="Cookie `csrftoken` ustawione.")},
    )
    def get(self, request, *args, **kwargs) -> Response:
        return Response(status=status.HTTP_204_NO_CONTENT)


# DRF only enforces CSRF for already authenticated sessions; login needs it too
# to prevent login CSRF.
@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["auth"],
        summary="Zaloguj",
        description="Tworzy sesję (cookie `sessionid`, HttpOnly). Wymaga `X-CSRFToken`.",
        request=LoginSerializer,
        responses={200: UserSerializer},
    )
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

    @extend_schema(
        tags=["auth"],
        summary="Wyloguj",
        request=None,
        responses={200: MessageSerializer},
    )
    def post(self, request, *args, **kwargs) -> Response:
        logout(request)
        return Response({"detail": "Wylogowano pomyślnie."}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["auth"],
        summary="Bieżący użytkownik",
        description="Zwraca zalogowanego użytkownika wraz z członkostwami w szkołach "
        "i rolami. 401 oznacza brak sesji.",
        responses={200: UserSerializer},
    )
    def get(self, request, *args, **kwargs) -> Response:
        request.user.last_active_at = timezone.now()
        request.user.save(update_fields=["last_active_at"])

        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
