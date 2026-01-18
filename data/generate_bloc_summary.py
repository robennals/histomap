#!/usr/bin/env python3
"""
Generate bloc GDP summary table from power_bloc_gdp_by_decade.csv

Output: A table with decades as rows and blocs as columns,
showing percentage of world GDP (PPP) for each bloc in each decade.
"""

import csv
from collections import defaultdict

def main():
    print("Loading bloc GDP data...")

    # Collect GDP percentages by decade and bloc
    bloc_gdp = defaultdict(lambda: defaultdict(float))
    all_blocs = set()
    all_decades = set()

    with open('power_bloc_gdp_by_decade.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            decade = int(row['year'])
            bloc = row['bloc']
            gdp_percent = float(row['gdp_percent'])

            bloc_gdp[decade][bloc] += gdp_percent
            all_blocs.add(bloc)
            all_decades.add(decade)

    # Sort blocs and decades
    sorted_decades = sorted(all_decades)
    sorted_blocs = sorted(all_blocs)

    print(f"Found {len(sorted_blocs)} blocs across {len(sorted_decades)} decades")

    # Write output CSV
    print("Writing bloc summary table...")
    with open('bloc_gdp_summary.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)

        # Write header
        header = ['Year'] + sorted_blocs
        writer.writerow(header)

        # Write data rows
        for decade in sorted_decades:
            row = [decade]
            for bloc in sorted_blocs:
                gdp_pct = bloc_gdp[decade].get(bloc, 0.0)
                row.append(round(gdp_pct, 2))
            writer.writerow(row)

    print("Done!")
    print("Output: bloc_gdp_summary.csv")

    # Print a preview
    print("\nPreview (first 5 decades):")
    print("-" * 80)

    # Print header
    header_str = f"{'Year':<8}"
    for bloc in sorted_blocs[:5]:  # Show first 5 blocs
        header_str += f"{bloc[:15]:<17}"
    print(header_str + "...")

    # Print first 5 decades
    for decade in sorted_decades[:5]:
        row_str = f"{decade:<8}"
        for bloc in sorted_blocs[:5]:
            gdp_pct = bloc_gdp[decade].get(bloc, 0.0)
            row_str += f"{gdp_pct:<17.2f}"
        print(row_str + "...")

if __name__ == '__main__':
    main()
