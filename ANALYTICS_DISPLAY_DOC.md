# Analytics Display Documentation (Plain English)

This document explains the business analytics in plain English using data mining language. It avoids programming terms and focuses on what data goes in and what insight comes out.

## Business Dashboard

### Vibe Score
Input (data signals):
- Overall customer sentiment score
- Total review volume
- Data status label (for example, New)
- Direction of change

Output (insight):
- Current overall sentiment score
- Short context line about sample size or readiness
- Directional badge if a trend is detected

### Total Reviews
Input (data signals):
- Total review count

Output (insight):
- Total volume of customer feedback

### Top Performing Aspect
Input (data signals):
- Strongest positive theme in recent feedback

Output (insight):
- Best-performing theme, described in plain language

### Review Activity
Input (data signals):
- Change intensity in review volume and sentiment
- Optional summary note

Output (insight):
- Priority level of change (for example, Monitor or Urgent)
- Two quick signals for experience and engagement
- Optional explanation of the shift

### Vibe Performance Trend
Input (data signals):
- Time series of sentiment scores across short, mid, and long windows
- Optional highlight points for the largest rise and fall
- Sample size and minimum threshold

Output (insight):
- Trend line of sentiment over time
- Peak and drop highlights
- Clear message when data is missing or not mature enough

### Peak and Drop Callout
Input (data signals):
- Largest positive change event
- Largest negative change event

Output (insight):
- Two callouts showing strongest rise and strongest fall
- Message when there are not enough signals

### Business Health
Input (data signals):
- Overall health score on a 0 to 1 scale
- Availability status
- Supporting insight labels

Output (insight):
- Health gauge with a simple label
- Hover breakdown of vibe, trend, experience consistency, and confidence

### What Customers Talk About
Input (data signals):
- Theme mentions and their counts

Output (insight):
- Share of attention per theme
- Short statement about the most discussed theme
- Empty state when mention volume is zero

### Sentiment Distribution
Input (data signals):
- Positive, neutral, negative share of feedback

Output (insight):
- Distribution of sentiment mix
- Plain statement about the dominant mood
- Empty state when data is too thin

### Customer Sentiment Trend
Input (data signals):
- Time series of sentiment change
- Reliability signals

Output (insight):
- Positive and negative movement over time
- Plain message when data is not reliable enough

### Vibe Score Forecast
Input (data signals):
- Historical sentiment series
- Forecasted sentiment series
- Predicted direction label

Output (insight):
- Past and projected sentiment path
- Current score, projected score, and expected change
- Plain forecast summary
- Message when history is too short

### Latest Reviews
Input (data signals):
- Most recent reviews

Output (insight):
- Short list of the newest feedback

## Business Analytics Page

### Executive Summary
Input (data signals):
- Health metrics
- Direction of trend
- Experience consistency score
- Data quality label
- History maturity label

Output (insight):
- Four tiles: Data Quality, Experience Consistency, Vibe Trend Direction, Data History

### Top Mentioned Aspects
Input (data signals):
- Theme counts and reliability indicator

Output (insight):
- Ranked theme volume bars
- Reliability tag
- Empty state when no themes are present

### Vibe Heatmap
Input (data signals):
- Daily sentiment snapshots
- Reliability indicator

Output (insight):
- 90-day calendar-style heatmap
- Daily score details on hover
- Average score for the period
- Empty state when history is too short

### Aspect Health
Input (data signals):
- Theme score, direction, and change

Output (insight):
- Theme-by-theme health bars and direction notes
- "No mentions yet" when a theme has no signal

### Primary Risk Driver
Input (data signals):
- Strongest negative theme
- Impact level and strength score
- Sample size signals

Output (insight):
- Most important risk area and its strength
- Small reliability note
- Empty state when no risk is identified

### Strengths and Positive Drivers
Input (data signals):
- Strongest positive theme
- Impact level and strength score
- Optional supporting themes

Output (insight):
- Most important strength and its score
- Supporting theme chips when available
- Empty state when no strength is identified

### Negative Signals
Input (data signals):
- List of negative signals with severity
- Optional pattern summary
- Reliability indicator

Output (insight):
- Up to four signal cards
- Pattern summary when available
- Reliability note
- Empty state when there are no issues

### Business Health Overview
Input (data signals):
- Health score and label
- Score drivers: vibe, trend, experience consistency, confidence
- Short insight text

Output (insight):
- Large health gauge with percent score
- Driver breakdown bars
- Short insight lines
