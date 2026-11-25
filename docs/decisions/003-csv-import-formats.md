# 003: Which CSV formats the balances import accepts

**Status:** accepted (Nov 25, 2026, issue #9)

## Context

Typing balances is the slowest part of onboarding, and people already have the numbers in brokerage downloads. The issue asks for a generic format plus one brokerage format, parsed with clear errors for bad rows. Personal financial data must not leave the browser.

## Options

1. **Match one named brokerage's export exactly.** Most realistic, but we have no real file to test against, and column names and footers change. A fixture invented to look like a specific brokerage's file could be wrong in ways we can't check.
2. **Generic only.** Easy, but users must reshape their data by hand, which defeats the point.
3. **A template plus the common "positions" layout.** Many brokerages offer a positions download with one row per holding and columns for the account name and current value, often with `$`, quoted thousands and disclaimer lines at the bottom. Detect the format by the `Account Name` and `Current Value` headers, add up holdings per account, and guess the account type from its name.

## Choice

Option 3. Formats are detected from the header row. The positions parser is tolerant of what these files actually contain (a byte-order mark, CRLF, quoted amounts, `--` for blank values, negative pending activity, one-cell footer lines). The account type is a keyword guess, so the app always shows which field each account went to, and the user can correct it. Parsing is a pure module (`src/import/`) with fixture-file tests. It runs in the browser on the file's text, so nothing is uploaded.

Trade-off: the brokerage fixture is synthetic. Supporting a specific brokerage whose headers differ means adding an alias for its column names, with a real (anonymized) sample as the fixture.
