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

    # Define empires to consolidate into "Other European Empires"
    # Keep only British, Russian, Japanese, Ottoman separate as major powers
    consolidate_to_other_european = {
        'Spanish Empire',
        'French Empire',
        'Portuguese Empire',
        'Austro-Hungarian Empire',
        'Dutch Empire',
        'German Empire',
        'Belgian Empire',
        'Italian Empire'
    }

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

            # Consolidate smaller European empires
            if bloc in consolidate_to_other_european:
                bloc = 'Other European Empires'

            bloc_gdp[decade][bloc] += gdp_percent
            all_blocs.add(bloc)
            all_decades.add(decade)

    # Sort decades chronologically
    sorted_decades = sorted(all_decades)

    # Define custom bloc order based on succession/inheritance
    # Stack blocs to maximize adjacency with territory transfer partners
    # Bottom to top: China → Ottoman (dissolves) → Other Euro Empires →
    # NATO (receives Euro empires below and British above) → British → US (British breakaway) →
    # Ind. Indian States (absorbed by British) → India (succession) →
    # Japanese → Russian → USSR → BRICS → Other (at top, residual non-aligned)
    bloc_order = [
        'China',
        'BRICS + Aligned',
        'India - post independence',  # Will be renamed to just "India"
        'Ottoman Empire',
        'Other European Empires',
        'NATO + Aligned',
        'British Empire',
        'US',
        'Independent Indian States',
        'Japanese Empire',
        'Russian Empire',
        'USSR + Aligned',
        'Other'
    ]

    # Sort blocs according to custom order, with any unlisted blocs at the end
    sorted_blocs = [b for b in bloc_order if b in all_blocs]
    sorted_blocs += sorted([b for b in all_blocs if b not in bloc_order])

    print(f"Found {len(sorted_blocs)} blocs across {len(sorted_decades)} decades")

    # Write output CSV
    print("Writing bloc summary table...")
    with open('bloc_gdp_summary.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)

        # Write header with renamed blocs
        header = ['Year'] + [
            'India' if bloc == 'India - post independence' else bloc
            for bloc in sorted_blocs
        ]
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
