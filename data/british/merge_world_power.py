#!/usr/bin/env python3
"""
Merge British and US world power data.
For years that overlap between the two datasets (1750-2020), use the US data
which is based on careful research. Keep the British data for earlier years.

The British file uses the same column names as the US file for common blocs,
with ancient empire columns (Roman Empire, etc.) added at the end.
"""

import csv
from pathlib import Path

def load_csv_data(filepath):
    """Load CSV data into a list of dictionaries."""
    data = []
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
        for row in reader:
            # Convert year to int and other values to float
            processed_row = {'Year': int(row['Year'])}
            for key in headers:
                if key != 'Year':
                    value = row[key].strip()
                    processed_row[key] = float(value) if value else 0.0
            data.append(processed_row)
    return data, headers

def main():
    # Define paths
    script_dir = Path(__file__).parent
    british_path = script_dir / 'world_power.csv'
    us_path = script_dir.parent / 'us' / 'bloc_gdp_summary.csv'
    output_path = script_dir / 'world_power.csv'

    print(f"Loading British data from: {british_path}")
    british_data, british_headers = load_csv_data(british_path)

    print(f"Loading US data from: {us_path}")
    us_data, us_headers = load_csv_data(us_path)

    # Create a mapping of US year -> row data
    us_data_by_year = {row['Year']: row for row in us_data}

    # Determine the overlap range
    us_years = set(us_data_by_year.keys())
    british_years = {row['Year'] for row in british_data}
    overlap_years = us_years & british_years

    print(f"\nOverlap years: {min(overlap_years)} to {max(overlap_years)}")
    print(f"Total overlapping years: {len(overlap_years)}")

    # Build merged data structure
    # The British file now uses the same column names as US for common blocs
    # Ancient empire columns are at the end and only have values for pre-1750 years
    merged_data = []

    # Ancient empire columns (only in British data, appended after common columns)
    # Note: "Independent Indian States" was merged into "India" for simplicity
    ancient_columns = ['Roman Empire', 'Parthian/Sassanid Empire', 'Byzantine Empire',
                       'Islamic Caliphate', 'Mongol Empire']

    for british_row in british_data:
        year = british_row['Year']

        if year in us_data_by_year:
            # Use US data for this year
            us_row = us_data_by_year[year]

            # Start with zeros for all columns
            merged_row = {'Year': year}
            for col in british_headers:
                if col != 'Year':
                    merged_row[col] = 0.0

            # Copy US data directly (column names now match)
            for col in us_headers:
                if col != 'Year' and col in merged_row:
                    merged_row[col] = us_row[col]

            print(f"Year {year}: Using US data")
        else:
            # Keep original British data for years before US data starts
            merged_row = british_row.copy()
            print(f"Year {year}: Using British data")

        merged_data.append(merged_row)

    # Write merged data
    print(f"\nWriting merged data to: {output_path}")
    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=british_headers)
        writer.writeheader()
        writer.writerows(merged_data)

    print(f"Successfully wrote {len(merged_data)} rows to {output_path}")
    print("\nMerge complete!")

if __name__ == '__main__':
    main()
