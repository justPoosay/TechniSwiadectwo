from typing import Any

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """``?page=2&page_size=50`` -> ``{count, page, page_size, total_pages, results}``.

    Returns page numbers instead of DRF's absolute next/previous URLs: behind the
    Next.js proxy those would point at the internal backend host.
    """

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
    page_query_description = "Numer strony (od 1)."
    page_size_query_description = "Liczba wyników na stronie (domyślnie 25, maks. 100)."

    def get_paginated_response(self, data: Any) -> Response:
        assert self.page is not None
        return Response(
            {
                "count": self.page.paginator.count,
                "page": self.page.number,
                "page_size": self.page.paginator.per_page,
                "total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema: dict[str, Any]) -> dict[str, Any]:
        return {
            "type": "object",
            "required": ["count", "page", "page_size", "total_pages", "results"],
            "properties": {
                "count": {
                    "type": "integer",
                    "example": 123,
                    "description": "Liczba wszystkich wyników.",
                },
                "page": {"type": "integer", "example": 1},
                "page_size": {"type": "integer", "example": self.page_size},
                "total_pages": {"type": "integer", "example": 5},
                "results": schema,
            },
        }
