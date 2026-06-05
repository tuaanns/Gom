import requests
import sys
import time

# Set stdout to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

url = "https://api.github.com/repos/The-Architist-Dev/gom-ai/actions/runs"
try:
    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
    data = resp.json()
    runs = data.get("workflow_runs", [])
    if runs:
        latest_run = runs[0]
        run_id = latest_run.get("id")
        status = latest_run.get("status")
        conclusion = latest_run.get("conclusion")
        print(f"Latest run ID: {run_id}")
        print(f"Status: {status}, Conclusion: {conclusion}")
        
        # Get jobs for this run
        jobs_url = f"https://api.github.com/repos/The-Architist-Dev/gom-ai/actions/runs/{run_id}/jobs"
        jobs_resp = requests.get(jobs_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
        jobs_data = jobs_resp.json()
        jobs = jobs_data.get("jobs", [])
        
        for j in jobs:
            print(f"Job Name: {j.get('name')}, Status: {j.get('status')}, Conclusion: {j.get('conclusion')}")
    else:
        print("No runs found.")
except Exception as e:
    print("Error:", e)
