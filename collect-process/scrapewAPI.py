import requests
from pathlib import Path
from datetime import datetime

BASE_URL = "https://ifcb.caloos.org"
# DATASET = "scripps-pier-ifcb-183"  # scripps pier
DATASET = "del-mar-mooring"  # del mar mooring pier

session = requests.Session()

def list_bins(dataset):
    url = f"{BASE_URL}/api/list_bins?dataset={dataset}"
    r = session.get(url)
    r.raise_for_status()
    return r.json()["data"]

def download_file(url, out_path):
    if out_path.exists():
        return
    r = session.get(url, stream=True)
    r.raise_for_status()
    with open(out_path, "wb") as f:
        for chunk in r.iter_content(8192):
            f.write(chunk)

s = datetime.now()
bins = list_bins(DATASET)
print(f"Found {len(bins)} bins in dataset {DATASET}")

month_str = None
date_str = None

for entry in bins:
    pid = entry["pid"]
    sample_time = entry["sample_time"]

    dt = datetime.fromisoformat(sample_time.replace("Z", ""))
    date_new = dt.strftime("%Y%m%d")
    month_new = dt.strftime("%Y%m")

    if date_str != date_new:
        print(f"Downloaded day: {date_str} in {(datetime.now()- s).total_seconds()}s")
        date_str = date_new

    if month_str != month_new:
        print(f"== Downloaded all data of month {month_str} in {(datetime.now()- s).total_seconds()}s")
        month_str = month_new

    out_dir = Path(f"./test/{month_str}")
    out_dir.mkdir(parents=True, exist_ok=True)

    files = {
        "adc": f"{BASE_URL}/{DATASET}/{pid}.adc",
        "hdr": f"{BASE_URL}/{DATASET}/{pid}.hdr",
        "features": f"{BASE_URL}/{DATASET}/{pid}_features.csv",
        "class_scores": f"{BASE_URL}/{DATASET}/{pid}_class_scores.csv"
    }

    for name, url in files.items():
        filename = url.split("/")[-1]
        out_path = out_dir / filename
        try:
            download_file(url, out_path)
        except requests.HTTPError:
            print(f"Missing {name} for {pid}")

print(f"Finished downloading ALL DATA in {(datetime.now()- s).total_seconds()}s")