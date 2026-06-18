from __future__ import annotations

from dotenv import dotenv_values
from google import genai


def classify_error(message: str) -> str:
    lowered = message.lower()
    if "resource_exhausted" in lowered or "quota" in lowered or "429" in lowered:
        return "QUOTA_EXHAUSTED"
    if "api_key_invalid" in lowered or "not valid" in lowered:
        return "INVALID_KEY"
    if "503" in lowered or "unavailable" in lowered or "high demand" in lowered:
        return "TEMP_UNAVAILABLE"
    return "ERROR"


def main() -> None:
    env = dotenv_values("gom-ai/.env")
    raw = env.get("GOOGLE_API_KEY") or ""
    keys = [value.strip() for value in raw.split(",") if value.strip()]
    print(f"google_key_count={len(keys)}")
    for index, key in enumerate(keys, start=1):
        print(f"key_{index}_prefix={key[:6]}...")
        try:
            client = genai.Client(api_key=key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents="Reply with OK only.",
            )
            text = (response.text or "").strip()
            print(f"key_{index}_status=OK")
            print(f"key_{index}_response={text[:30]}")
        except Exception as error:
            message = str(error).replace("\n", " ")
            print(f"key_{index}_status={classify_error(message)}")
            print(f"key_{index}_detail={message[:500]}")


if __name__ == "__main__":
    main()
