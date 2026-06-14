import json
import re
from pathlib import Path

file_path = Path(r"C:\Users\Admin\.gemini\antigravity-ide\brain\f40bbb88-2073-4e30-8090-3583d29b713f\.system_generated\steps\124\content.md")
html_content = file_path.read_text(encoding="utf-8")

# Let's find any JSON block that looks like the ChatGPT conversation model or react state
# In ChatGPT share pages, the conversation is often in a JSON inside a script tag: e.g. <script id="__NEXT_DATA__" type="application/json">...</script>
# or window.__SHARE_DATA__ = ...
print("Searching for __NEXT_DATA__...")
next_data_match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html_content)
if next_data_match:
    print("Found __NEXT_DATA__!")
    try:
        data = json.loads(next_data_match.group(1))
        # Save to a file for review
        with open("parsed_next_data.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Saved __NEXT_DATA__ to parsed_next_data.json")
    except Exception as e:
        print("Error parsing __NEXT_DATA__:", e)

# Or we can search for script tags containing JSON
for m in re.finditer(r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', html_content):
    content = m.group(1)
    if "conversation" in content or "messages" in content or "share" in content:
        print("Found JSON script with conversation keywords!")
        try:
            js = json.loads(content)
            print("Keys:", list(js.keys()) if isinstance(js, dict) else "not dict")
            # If it's the state, let's extract the messages
            # Typically has: props -> pageProps -> sharedConversationId, or props -> pageProps -> response -> posts
            posts = js.get("props", {}).get("pageProps", {}).get("response", {}).get("posts", [])
            if not posts:
                # React Router 7 format (sometimes props -> pageProps -> serverResponse -> data)
                posts = js.get("props", {}).get("pageProps", {}).get("serverResponse", {}).get("data", {}).get("posts", [])
            
            # Let's check another common location
            if not posts:
                # props -> pageProps -> response -> posts
                page_props = js.get("props", {}).get("pageProps", {})
                if "serverResponse" in page_props:
                    posts = page_props["serverResponse"].get("posts", [])
            
            # If still not found, let's search recursively for "posts" or "message"
            if posts:
                print(f"Found {len(posts)} posts/messages!")
                for post in posts:
                    author = post.get("author", {}).get("role", "unknown")
                    content_text = ""
                    content_parts = post.get("content", {}).get("parts", [])
                    if content_parts:
                        content_text = "\n".join(str(p) for p in content_parts)
                    print(f"[{author.upper()}]: {content_text}\n" + "-"*40)
        except Exception as e:
            print("Error parsing this script JSON:", e)

# Let's also run a simple text extraction of all visible body text to see if we can find anything
from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.in_script = False
        self.in_style = False

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            self.in_script = True
        elif tag == "style":
            self.in_style = True

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_script = False
        elif tag == "style":
            self.in_style = False

    def handle_data(self, data):
        if not self.in_script and not self.in_style:
            text = data.strip()
            if text:
                self.text.append(text)

extractor = TextExtractor()
extractor.feed(html_content)
extracted_text = "\n".join(extractor.text)
Path("extracted_text.txt").write_text(extracted_text, encoding="utf-8")
print("Extracted body text saved to extracted_text.txt")
