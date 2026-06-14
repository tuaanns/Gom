import json
import re
from pathlib import Path

file_path = Path(r"C:\Users\Admin\.gemini\antigravity-ide\brain\f40bbb88-2073-4e30-8090-3583d29b713f\.system_generated\steps\124\content.md")
html_content = file_path.read_text(encoding="utf-8")

# Let's write all script contents to a text file for inspection
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html_content)
print(f"Found {len(scripts)} scripts.")

# Let's search inside the script contents for strings that contain escaped Vietnamese or English conversation parts.
# Let's search for the title "Trang ph"
for i, script in enumerate(scripts):
    if "Trang ph" in script or "ph\\u00e1p" in script or "legal" in script or "Terms" in script:
        print(f"Script {i} matches keywords!")
        # Let's print the first 500 chars
        print(script[:500])
        # Write to a file for analysis
        Path(f"matching_script_{i}.js").write_text(script, encoding="utf-8")

# Let's write a regex search for "serverResponse" or "sharedConversation" or "title" in the whole HTML
matches = re.findall(r'"title"\s*:\s*"(.*?)"', html_content)
print("Titles found in JSON strings:", matches)

# Let's search for text patterns that look like conversation messages.
# If they are inside JSON, they might be in fields like "text", "content", "parts", etc.
# Let's parse all JSON blocks in the HTML
# JSON blocks usually start with { and end with } or are in script tags
for m in re.finditer(r'\{[^{}]*\}', html_content):
    pass # too simple, let's try to extract JSON from the script tags

# Let's look at the script matching json
for i, script in enumerate(scripts):
    if "client-bootstrap" in html_content:
        # Check if the script contains json data
        json_match = re.search(r'id="client-bootstrap"[^>]*>(.*?)</script>', html_content)
        if json_match:
            try:
                bootstrap_data = json.loads(json_match.group(1))
                print("Parsed bootstrap JSON!")
                # Save it
                with open("bootstrap.json", "w", encoding="utf-8") as f:
                    json.dump(bootstrap_data, f, indent=2, ensure_ascii=False)
                
                # Let's search inside bootstrap_data for shared conversation
                # Typically inside: statsigPayload or other state variables
                # Let's search for "posts" or "messages" or "serverResponse" in keys
                def find_keys(d, target, path=""):
                    if isinstance(d, dict):
                        for k, v in d.items():
                            if target.lower() in k.lower():
                                print(f"Found key match: {path}.{k}")
                            find_keys(v, target, f"{path}.{k}")
                    elif isinstance(d, list):
                        for idx, item in enumerate(d):
                            find_keys(item, target, f"{path}[{idx}]")
                
                find_keys(bootstrap_data, "post")
                find_keys(bootstrap_data, "message")
                find_keys(bootstrap_data, "convo")
                find_keys(bootstrap_data, "title")
                find_keys(bootstrap_data, "serverResponse")
            except Exception as e:
                print("Error parsing bootstrap script:", e)
            break
