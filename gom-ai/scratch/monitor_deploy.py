import requests
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')
url = "https://api.github.com/repos/The-Architist-Dev/gom-ai/actions/runs/26973017647"

print("Starting monitoring for run 26973017647...")
for i in range(30):
    try:
        r = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15).json()
        status = r.get("status")
        conclusion = r.get("conclusion")
        print(f"Attempt {i+1}: Status={status}, Conclusion={conclusion}")
        if status == "completed":
            print(f"Run completed with conclusion: {conclusion}")
            
            # Fetch jobs to confirm status of deploy
            jobs_url = f"https://api.github.com/repos/The-Architist-Dev/gom-ai/actions/runs/26973017647/jobs"
            jobs_resp = requests.get(jobs_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15).json()
            for job in jobs_resp.get("jobs", []):
                print(f"Job: {job.get('name')}, Status: {job.get('status')}, Conclusion: {job.get('conclusion')}")
            break
    except Exception as e:
        print("Error:", e)
    time.sleep(10)
