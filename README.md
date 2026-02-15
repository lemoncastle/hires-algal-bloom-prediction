## CapstoneB

### Repo Directory
- ```/collect-process``` Scripts for scraping/processing
- ```/data``` Processed data
- ```/docs``` Project website
- ```/imgs```
- ```/models```
- ```/other``` Writeup/poster and etc..

Links to raw data (UCSD personal OneDrive):
- [IFCB183_2022](https://ucsdcloud-my.sharepoint.com/:u:/g/personal/ady005_ucsd_edu/IQD04nN3vEYVQJvnQ-UDF9G-AaKE8-MS5LIDIla0RRErd0A?e=3naPhH) 626MB zipped / 1.9GB raw
- [IFCB183_2023](https://ucsdcloud-my.sharepoint.com/:u:/g/personal/ady005_ucsd_edu/IQDU5ICaVgteR6p-yTmGK5ZyAV6XU1SX7uJmfHw1TL4uduM?e=NNUJUo) 3.4GB zipped / 10.8GB raw
- [IFCB183_2024](https://ucsdcloud-my.sharepoint.com/:u:/g/personal/ady005_ucsd_edu/IQDocyNz6CAwTIjfQ7Km2OMKAUuFbsN1E14rkuqEvRW0irA?e=LexqwY) 17.6GB zipped / 56.2GB raw
- [IFCB183_2025](https://ucsdcloud-my.sharepoint.com/:u:/g/personal/ady005_ucsd_edu/IQBVWe3tqkhSR6woE53VSHQIAU3e1OL_qt1NLX22Xg_CuYc?e=3Vj1pC) 14.5GB zipped / 46GB raw
- [Env_data_2022-2026](https://ucsdcloud-my.sharepoint.com/:u:/g/personal/ady005_ucsd_edu/IQDsi2SYlOKySJq7y-i1QsScAZOX7rsZYVydz1B_E1BgZaY?e=cgTDgU) 66MB zipped / 623MB raw
- [IFCB158_2021-2026](https://ucsdcloud-my.sharepoint.com/:u:/g/personal/ady005_ucsd_edu/IQA7Q8G7SiHuQ5IbYnRiCvIIAeKIBIsfvyUFIHVUXGKH5mM?e=oHnTCk) 9.56GB zipped / 30.2GB raw

### Data Collection
[Scripps Pier IFCB 183](https://ifcb.caloos.org/timeline?dataset=scripps-pier-ifcb-183)
- Data spans October 2022 - January 2026, scraping took place Jan 5-26th

[Del Mar Mooring IFCB 158](https://ifcb.caloos.org/bin?dataset=del-mar-mooring)
- Data spans June 2021 - January 2026, scraping took place week of Feb 2nd

```
selenium==4.39.0
webdriver-manager==4.0.2
beautifulsoup4==4.14.2
requests==2.32.5
```
Used laptop running Windows 11 LTSC (Python 3.11.9)
- Ungoogled chromium Version 137.0.7151.119(64-bit)
    - Any modern browser works ([docs](https://pypi.org/project/webdriver-manager/))

### Other Data Collected
[California Ocean Observing Systems Data Portal](https://data.caloos.org/#metadata/120738/station/data) at Scripps Pier
- CTD and with SeapHOx

```
Temperature
Salinity 
Chlorophyll
Conductivity
Sea Water Density 
Sea Water Pressure 
pH
Oxygen
```
From [Tides and Currents](https://tidesandcurrents.noaa.gov/stationhome.html?id=9410230) at Scripps Pier

We collected various meteorlogical data sampled by hour:
```
Wind Speed (m/s)
Wind Dir (deg)
Wind Gust (m/s)
Air Temp (°C)
Baro (mb)Humidity (%)
Visibility (km)
Water Levels (m)
```
[CALHABMAP](https://data.caloos.org/#module-metadata/5c35689e-2b3a-4bc9-9f5d-e526a9c19620/85653d75-c0b7-48e9-b1b1-f1c4071b10d3) provides more data at Scripps Pier that spans to 2019 but the resolution is week/monthly, and is manually collected. 