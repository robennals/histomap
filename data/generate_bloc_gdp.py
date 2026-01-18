#!/usr/bin/env python3
"""
Generate historical power bloc GDP dataset by merging:
1. country_bloc_periods.csv - bloc assignments over time
2. Madison World GDP data - GDP per capita and population

Output: power_bloc_gdp_by_decade.csv with GDP data by country/bloc/decade
"""

import csv
from collections import defaultdict
import math

# Decades to generate (1750, 1760, ... 2020)
DECADES = list(range(1750, 2030, 10))

def load_bloc_assignments(filepath):
    """Load bloc assignments from CSV into dictionary."""
    assignments = defaultdict(list)
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            country_code = row['countrycode']
            assignments[country_code].append({
                'start_year': int(row['start_year']),
                'end_year': int(row['end_year']),
                'bloc': row['bloc'],
                'percentage': float(row['percentage'])
            })
    return assignments

def load_gdp_data(filepath):
    """Load Madison GDP data into dictionary."""
    gdp_data = defaultdict(list)
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            country_code = row['countrycode']
            try:
                year = int(row['year'])
                gdppc = float(row['gdppc'].replace(',', '')) if row['gdppc'] else None
                pop = float(row['pop'].replace(',', '')) if row['pop'] else None

                if gdppc is not None and pop is not None:
                    gdp_data[country_code].append({
                        'year': year,
                        'gdppc': gdppc,
                        'pop': pop
                    })
            except (ValueError, KeyError):
                continue

    # Sort by year for each country
    for country_code in gdp_data:
        gdp_data[country_code].sort(key=lambda x: x['year'])

    return gdp_data

def get_country_name(filepath, country_code):
    """Get country name from Madison dataset."""
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['countrycode'] == country_code:
                return row['country']
    return country_code

def interpolate_gdp(gdp_data, year):
    """Interpolate GDP data for a specific year."""
    if not gdp_data:
        return None, None

    # Find exact match
    for entry in gdp_data:
        if entry['year'] == year:
            return entry['gdppc'], entry['pop']

    # Find surrounding years for interpolation
    before = [e for e in gdp_data if e['year'] < year]
    after = [e for e in gdp_data if e['year'] > year]

    if before and after:
        # Linear interpolation
        y1_data = before[-1]  # closest before
        y2_data = after[0]     # closest after

        y1, y2 = y1_data['year'], y2_data['year']
        gdppc1, gdppc2 = y1_data['gdppc'], y2_data['gdppc']
        pop1, pop2 = y1_data['pop'], y2_data['pop']

        # Linear interpolation
        ratio = (year - y1) / (y2 - y1)
        gdppc = gdppc1 + (gdppc2 - gdppc1) * ratio
        pop = pop1 + (pop2 - pop1) * ratio

        return gdppc, pop

    elif before and not after:
        # Extrapolate forward - only allow 20 years max
        years_ahead = year - before[-1]['year']
        if years_ahead > 20:
            return None, None

        if len(before) >= 2:
            recent = before[-2:]
            years_diff = recent[1]['year'] - recent[0]['year']
            gdppc_growth = (recent[1]['gdppc'] / recent[0]['gdppc']) ** (1 / years_diff)
            pop_growth = (recent[1]['pop'] / recent[0]['pop']) ** (1 / years_diff)

            gdppc = recent[1]['gdppc'] * (gdppc_growth ** years_ahead)
            pop = recent[1]['pop'] * (pop_growth ** years_ahead)

            return gdppc, pop
        else:
            # Only one point, just use it if within 10 years
            if years_ahead <= 10:
                return before[0]['gdppc'], before[0]['pop']
            return None, None

    elif not before and after:
        # Extrapolate backward - be conservative but allow further back for estimates
        years_back = after[0]['year'] - year

        # Use 20 year limit by default, but allow up to 70 years for better estimation
        max_years_back = 20
        if len(after) >= 3:
            max_years_back = 70  # Allow more if we have 3+ points for better trend

        if years_back > max_years_back:
            return None, None

        if len(after) >= 3:
            # Use first 3 points for more robust growth estimation
            early = after[:3]
            # Calculate average annual growth rate across the 3 points
            total_years = early[2]['year'] - early[0]['year']
            gdppc_total_growth = (early[2]['gdppc'] / early[0]['gdppc']) ** (1 / total_years)
            pop_total_growth = (early[2]['pop'] / early[0]['pop']) ** (1 / total_years)

            # Calculate backwards extrapolation
            gdppc_back = early[0]['gdppc'] / (gdppc_total_growth ** years_back)
            pop_back = early[0]['pop'] / (pop_total_growth ** years_back)

            # NEVER allow GDP per capita to be higher going backwards
            if gdppc_back > early[0]['gdppc']:
                return None, None

            return gdppc_back, pop_back
        elif len(after) >= 2:
            early = after[:2]
            years_diff = early[1]['year'] - early[0]['year']
            gdppc_growth = (early[1]['gdppc'] / early[0]['gdppc']) ** (1 / years_diff)
            pop_growth = (early[1]['pop'] / early[0]['pop']) ** (1 / years_diff)

            # Calculate backwards extrapolation
            gdppc_back = early[0]['gdppc'] / (gdppc_growth ** years_back)
            pop_back = early[0]['pop'] / (pop_growth ** years_back)

            # NEVER allow GDP per capita to be higher going backwards
            if gdppc_back > early[0]['gdppc']:
                return None, None

            return gdppc_back, pop_back
        else:
            # Only one point, just use it if within 10 years
            if years_back <= 10:
                return after[0]['gdppc'], after[0]['pop']
            return None, None

    return None, None

def get_bloc_for_year(assignments, year):
    """Get bloc assignment(s) for a specific year."""
    blocs = []
    for assignment in assignments:
        if assignment['start_year'] <= year <= assignment['end_year']:
            blocs.append({
                'bloc': assignment['bloc'],
                'percentage': assignment['percentage']
            })
    return blocs

def main():
    print("Loading bloc assignments...")
    bloc_assignments = load_bloc_assignments('country_bloc_periods.csv')

    print("Loading Madison GDP data...")
    gdp_data = load_gdp_data('madison_world_gdp/mpd2020/Full data-Table 1.csv')

    # Get country names
    print("Loading country names...")
    country_names = {}
    with open('madison_world_gdp/mpd2020/Full data-Table 1.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['countrycode'] not in country_names:
                country_names[row['countrycode']] = row['country']

    # Generate output rows
    print("Generating decade-by-decade data...")
    output_rows = []

    # First pass: collect all data
    for country_code in bloc_assignments.keys():
        country_name = country_names.get(country_code, country_code)
        country_gdp = gdp_data.get(country_code, [])

        for decade in DECADES:
            # Get bloc assignment(s) for this decade
            blocs = get_bloc_for_year(bloc_assignments[country_code], decade)

            if not blocs:
                continue  # No assignment for this decade

            # Get/interpolate GDP data
            gdppc, pop = interpolate_gdp(country_gdp, decade)

            if gdppc is None or pop is None:
                continue  # No GDP data available

            gdp = gdppc * pop

            # Create row(s) for each bloc assignment
            for bloc_info in blocs:
                output_rows.append({
                    'countrycode': country_code,
                    'country': country_name,
                    'year': decade,
                    'bloc': bloc_info['bloc'],
                    'bloc_percentage': bloc_info['percentage'],
                    'gdppc': gdppc,
                    'pop': pop,
                    'gdp': gdp,
                    'gdp_percent': None  # Will calculate in second pass
                })

    # Second pass: calculate world GDP totals per decade and GDP percentages
    print("Calculating GDP percentages...")
    world_gdp_by_decade = defaultdict(float)

    for row in output_rows:
        decade = row['year']
        # Account for bloc percentage (e.g., Germany split)
        weighted_gdp = row['gdp'] * (row['bloc_percentage'] / 100.0)
        world_gdp_by_decade[decade] += weighted_gdp

    # Update GDP percentages
    for row in output_rows:
        decade = row['year']
        world_gdp = world_gdp_by_decade[decade]
        weighted_gdp = row['gdp'] * (row['bloc_percentage'] / 100.0)
        row['gdp_percent'] = round((weighted_gdp / world_gdp) * 100, 2)

    # Write output
    print("Writing output file...")
    with open('power_bloc_gdp_by_decade.csv', 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['countrycode', 'country', 'year', 'bloc', 'bloc_percentage',
                     'gdppc', 'pop', 'gdp', 'gdp_percent']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        # Sort by country, then year
        output_rows.sort(key=lambda x: (x['countrycode'], x['year']))

        # Round values for output
        for row in output_rows:
            row['gdppc'] = int(round(row['gdppc']))
            row['pop'] = int(round(row['pop']))
            row['gdp'] = int(round(row['gdp']))
            row['bloc_percentage'] = round(row['bloc_percentage'], 2)

        writer.writerows(output_rows)

    print(f"Done! Generated {len(output_rows)} rows across {len(DECADES)} decades")
    print(f"Output: power_bloc_gdp_by_decade.csv")

if __name__ == '__main__':
    main()
