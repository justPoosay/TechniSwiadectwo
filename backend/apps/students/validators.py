from django.core.exceptions import ValidationError


def validate_pesel(value: str | None) -> None:
    if not value:
        return

    if not value.isdigit() or len(value) != 11:
        raise ValidationError("Numer PESEL musi składać się z dokładnie 11 cyfr.")

    weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]
    checksum = sum(
        int(digit) * weight for digit, weight in zip(value[:10], weights, strict=True)
    )
    control_digit = (10 - (checksum % 10)) % 10

    if control_digit != int(value[10]):
        raise ValidationError("Niepoprawna cyfra kontrolna numeru PESEL.")
