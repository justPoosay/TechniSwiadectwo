from django.contrib.auth import authenticate
from rest_framework import serializers

from apps.users.models import SchoolMembership, User


class SchoolMembershipSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source="school.name", read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = SchoolMembership
        fields = ["id", "school", "school_name", "role", "role_display", "is_active"]


class UserSerializer(serializers.ModelSerializer):
    memberships = SchoolMembershipSerializer(many=True, read_only=True)
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "is_active",
            "is_staff",
            "date_joined",
            "last_active_at",
            "memberships",
        ]


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data: dict) -> dict:
        email = data.get("email")
        password = data.get("password")

        user = authenticate(email=email, password=password)
        if not user:
            raise serializers.ValidationError("Nieprawidłowy adres e-mail lub hasło.")
        if not user.is_active:
            raise serializers.ValidationError("Konto użytkownika jest nieaktywne.")

        data["user"] = user
        return data
