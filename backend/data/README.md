# data/

Place your 10 fund Excel files here.

## Expected format per file

| Column 0 | Column 1  |
|----------|-----------|
| Date     | Price     |
| 2020-01-02 | 1.2345  |
| 2020-01-03 | 1.2398  |
| ...      | ...       |

- The **filename** (without extension) becomes the fund label displayed in the UI.
- Dates can be in any format parseable by `pandas.to_datetime`.
- Prices should be daily closing / NAV prices in a consistent currency.
- All 10 files are aligned on their common date range (missing dates are dropped).

## Example filenames
```
Fullerton_Short_Duration_Bond.xlsx
LionGlobal_Singapore_Trust.xlsx
Nikko_AM_Singapore_STI.xlsx
...
```

## Changing column positions
If your date/price columns are not columns 0 and 1, edit `DATE_COL` and `PRICE_COL`
at the top of `backend/app.py`.
