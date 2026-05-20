from fastapi import Request

from backend.app.core.ml_registry import MLRegistry

def get_models(request: Request) -> MLRegistry:
    return request.app.state.models

