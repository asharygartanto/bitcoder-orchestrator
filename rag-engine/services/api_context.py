import httpx
import json
import re
from typing import Optional


class ApiContextService:
    def __init__(self):
        self.timeout = 30.0

    def _resolve_template(self, template: any, query: str) -> any:
        if isinstance(template, str):
            template = template.replace("{{query}}", query)
            for match in re.finditer(r"\{\{extract:(.+?)\}\}", template):
                pattern = match.group(1)
                found = re.search(pattern, query)
                if found:
                    template = template.replace(match.group(0), found.group(1) if found.lastindex else found.group(0))
                else:
                    template = template.replace(match.group(0), "")
            return template
        elif isinstance(template, dict):
            return {k: self._resolve_template(v, query) for k, v in template.items()}
        elif isinstance(template, list):
            return [self._resolve_template(v, query) for v in template]
        return template

    async def call_api(self, api_config: dict) -> Optional[dict]:
        method = api_config.get("method", "GET").upper()
        endpoint = api_config.get("endpoint", "").strip()
        headers = api_config.get("headers", {})
        body_template = api_config.get("body_template")

        if not endpoint:
            return None

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                kwargs = {"headers": headers}

                if method == "GET":
                    response = await client.get(endpoint, **kwargs)
                elif method == "POST":
                    if body_template:
                        kwargs["json"] = body_template
                    response = await client.post(endpoint, **kwargs)
                elif method == "PUT":
                    if body_template:
                        kwargs["json"] = body_template
                    response = await client.put(endpoint, **kwargs)
                elif method == "PATCH":
                    if body_template:
                        kwargs["json"] = body_template
                    response = await client.patch(endpoint, **kwargs)
                else:
                    return None

                response.raise_for_status()

                try:
                    return response.json()
                except json.JSONDecodeError:
                    return {"raw_response": response.text}

        except httpx.HTTPError as e:
            return {"error": str(e), "endpoint": endpoint}
        except Exception as e:
            return {"error": str(e), "endpoint": endpoint}

    async def gather_api_contexts(
        self, api_configs: list[dict], query: str = ""
    ) -> list[dict]:
        if not api_configs:
            return []

        results = []
        for config in api_configs:
            if not config.get("is_active", True):
                continue

            body_template = config.get("body_template")
            if body_template and query:
                config = {**config, "body_template": self._resolve_template(body_template, query)}

            result = await self.call_api(config)
            if result:
                results.append(
                    {
                        "api_name": config.get("name", "Unknown API"),
                        "api_endpoint": config.get("endpoint", ""),
                        "data": result,
                    }
                )

        return results
