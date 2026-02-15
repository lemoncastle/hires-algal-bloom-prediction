from datetime import datetime
from pathlib import Path
import pandas as pd
import glob
import os
s = datetime.now()

base_path = "./ifcb_158/"
burger = Path(base_path) # used for iterating months I'm kinda hungry
out_dir = Path("./processed/")
out_dir.mkdir(parents=True, exist_ok=True)

def read_hdr(path: Path) -> dict:
    return { k.strip(): v.strip()
            for line in path.read_text().splitlines()
            if ":" in line
            for k, v in [line.split(":", 1)] }

samples = []
ml_samples = []

taxa = 'Lingulodinium_polyedra'
taxa2 = 'Prorocentrum_micans'
out_file = out_dir / "processed_ifcb158.csv" # change file name for each year

# iterate through each month directory
for month_dir in sorted(burger.iterdir()):
    path = base_path + month_dir.name + "/"
    print(f"Processing files in {path}... {(datetime.now()- s).total_seconds()}s")
    
    # read ml analyzed file for month, group by date and append
    ml_file = Path(path) / f"ml_{month_dir.name}.csv"
    ml_df = pd.read_csv(ml_file)
    ml_samples.append(ml_df)

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
                        roi_count = features.shape[0]
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
                continue
                # hdr file doesn't have ROI count so skip 
                # and deriving ml analyzed isn't consistent for the first year (2021) so skipping for now...
        
        # if both files read, calculate expected values and append
        if isinstance(features, pd.DataFrame) and isinstance(class_scores, pd.DataFrame):
            weights = class_scores[taxa]
            weighted_means = (features.multiply(weights, axis=0).sum()/ weights.sum())
            sample_row = {
                "date": date,
                "Lpoly_expected": weights.sum(),
                "Pmicans_expected": class_scores[taxa2].sum(),
                "roiCount": roi_count
                }
            for col, val in weighted_means.items():
                sample_row[col] = val
            samples.append(sample_row)

# make dataframes, merge and calculate Lpoly per ml
samples_df = pd.DataFrame(samples)
samples_df["date"] = samples_df["date"].astype("int64")

ml_df_all = pd.concat(ml_samples, ignore_index=True)
ml_df_all["date"] = ml_df_all["date"].astype("int64")

samples_df = samples_df.merge(ml_df_all[["date", "ml_analyzed", "ROI/ml"]],on="date",how="left")
samples_df.rename(columns={"ROI/ml": "ROI_per_ml"}, inplace=True)

samples_df["Lpoly_expected_ml"] = samples_df["Lpoly_expected"] / samples_df["ml_analyzed"]
samples_df["Pmicans_expected_ml"] = samples_df["Pmicans_expected"] / samples_df["ml_analyzed"]

daily = samples_df.groupby("date", as_index=False).mean()

# reorder columns to have important ones first
important = ["date", "roiCount", "ml_analyzed", "ROI_per_ml", "Lpoly_expected", "Lpoly_expected_ml", "Pmicans_expected", "Pmicans_expected_ml"]
all_cols = daily.columns.tolist()
other_cols = [c for c in all_cols if c not in important]
new_order = important + other_cols
daily = daily[new_order]

daily.to_csv(out_file, index=False)
print(f"Processing complete in {(datetime.now()- s).total_seconds()}s yay")