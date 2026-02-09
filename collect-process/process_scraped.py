from datetime import datetime
from pathlib import Path
import pandas as pd
import glob
import os
s = datetime.now()

base_path = "./ifcb_downloads/"
burger = Path(base_path) # used for iterating months I'm kinda hungry
out_dir = Path("./processed/")
out_dir.mkdir(parents=True, exist_ok=True)

def read_hdr(path: Path) -> dict:
    return { k.strip(): v.strip()
            for line in path.read_text().splitlines()
            if ":" in line
            for k, v in [line.split(":", 1)] }

samples = []

taxa = 'Lingulodinium_polyedra'
taxa2 = 'Prorocentrum_micans'
out_file = out_dir / "processed_25.csv" # change file name for each year

# iterate through each month directory
for month_dir in sorted(burger.iterdir()):
    path = base_path + month_dir.name + "/"
    print(f"Processing files in {path}... {(datetime.now()- s).total_seconds()}s")

    # for each hdr file in month folder get date and find matching files (with date)
    for files in glob.glob(path + '*.hdr'):
        timestamp = os.path.basename(files).split('_')[0].lstrip('D')
        date = timestamp.split('T')[0]
        
        # read files with matching timestamp (1 bin)
        for match in glob.glob(os.path.join(path, f"*{timestamp}*")):
            if match.endswith('.csv'):
                if "_features" in match:
                    try:
                        features = pd.read_csv(Path(match))
                        features.drop(columns=['roi_number'], inplace=True)
                    except pd.errors.EmptyDataError:
                        features = None
                        print(f"Features file is empty for date {timestamp}")
                else:
                    try:
                        class_scores = pd.read_csv(Path(match), usecols=['pid', taxa, taxa2])
                    except pd.errors.EmptyDataError:
                        class_scores = None
                        print(f"Class scores file is empty for date {timestamp}")
            elif match.endswith('hdr'):
                hdr = read_hdr(Path(match))
                roi_count = float(hdr["roiCount"])
                
                # https://github.com/hsosik/ifcb-analysis/blob/master/IFCB_tools/IFCB_volume_analyzed.m
                # derive ml analyzed from run time and inhibit time, convert to minutes and apply 0.25 ml/min flow rate
                runTime = hdr["runTime"]
                inhibitTime = hdr["inhibitTime"]
                ml_analyzed = float((0.25*(runTime-inhibitTime))/60)

        # if both files read, calculate expected values and append
        if isinstance(features, pd.DataFrame) and isinstance(class_scores, pd.DataFrame):
            weights = class_scores[taxa]
            weighted_means = (features.multiply(weights, axis=0).sum()/ weights.sum())
            sample_row = {
                "date": date,
                "roiCount": roi_count,
                "ml_analyzed": ml_analyzed,
                "ROI_per_ml": roi_count / ml_analyzed,
                "Lpoly_expected": weights.sum(),
                "Lpoly_expected_ml": weights.sum() / ml_analyzed,
                "Pmicans_expected": class_scores[taxa2].sum(),
                "Pmicans_expected_ml": class_scores[taxa2].sum() / ml_analyzed
            }
            for col, val in weighted_means.items():
                sample_row[col] = val
            samples.append(sample_row)

# make dataframes, merge and calculate Lpoly per ml
samples_df = pd.DataFrame(samples)
samples_df["date"] = samples_df["date"].astype("int64")
daily = samples_df.groupby("date", as_index=False).mean()

# reorder columns to have important ones first
# important = ["date", "roiCount", "ml_analyzed", "ROI_per_ml", "Lpoly_expected", "Lpoly_expected_ml", "Pmicans_expected", "Pmicans_expected_ml"]
# all_cols = daily.columns.tolist()
# other_cols = [c for c in all_cols if c not in important]
# new_order = important + other_cols
# daily = daily[new_order]

daily.to_csv(out_file, index=False)
print(f"Processing complete in {(datetime.now()- s).total_seconds()}s yay")