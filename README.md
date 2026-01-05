# Sudoku Difficulty + Validity Analyzer

A small, browser-based tool for checking Sudoku puzzles.

It can:
- Validate whether a puzzle follows standard Sudoku rules
- Detect if a puzzle has no solution, a single solution, or multiple solutions
- Solve puzzles using basic logical techniques (singles, hidden singles, naked pairs)
- Provide a simple difficulty estimate based on the techniques required

## Demo
https://sam-perry-usa.github.io/Sudoku-Analyser/

## Running locally
Download the repository and open `index.html` in any modern browser.

## Input format
Puzzles are provided as a single 81-character string:
- Use digits `1–9` for given values
- Use `.` or `0` for empty cells

## Notes
This project runs entirely in the browser. Some puzzles can be expensive to verify, so the uniqueness check runs in a time-limited worker to keep the page responsive.

## Related
If you enjoy logic and number puzzles, you might also like  
https://www.sudoku4adults.com
