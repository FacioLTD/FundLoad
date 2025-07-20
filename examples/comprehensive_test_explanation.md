# Comprehensive Test Cases Explanation

This document explains the test cases in `comprehensive_test.txt` and which specific rules they test.

## Test Cases by Customer ID

### Customer 1001 (Daily Limit Test)
- Transactions totaling $5,600 on the same day (July 20, 2025)
- Tests: **Daily Limit** ($5,000 per customer per day)
- Expected outcome: First transactions accepted until $5,000 limit is reached, then rejected
- Transaction IDs: 1001, 1002, 1003, 1004

### Customer 1002 (Daily Limit Edge Case)
- Transactions totaling exactly $5,000 + $1 on the same day (July 20, 2025)
- Tests: **Daily Limit** edge case (exactly at the limit + $1)
- Expected outcome: First transaction accepted ($5,000), second transaction rejected ($1)
- Transaction IDs: 1005, 1006

### Customer 1003 (Daily Load Count Test)
- 4 transactions of $1,000 each on the same day (July 20, 2025)
- Tests: **Daily Load Count** (Maximum 3 load attempts per customer per day)
- Expected outcome: First 3 transactions accepted, 4th transaction rejected
- Transaction IDs: 1072, 1008, 1092, 1010

### Customer 1004 (Weekly Limit Test)
- $3,000 per day for 8 consecutive days (July 14-21, 2025)
- Tests: **Weekly Limit** ($20,000 per customer per week - rolling 7-day window)
- Expected outcome: First transactions accepted until weekly limit is reached, then rejected
- Transaction IDs: 1011-1018

### Customer 1005 (Prime ID Rules Test)
- Multiple transactions with prime number IDs (2, 3, 5, 7, 11, 13) on the same day (July 20, 2025)
- Tests: **Prime ID Rules** (Prime number IDs limited to 1 transaction per day)
- Expected outcome: Only the first transaction with a prime ID should be accepted
- Transaction IDs: 2, 3, 5, 7, 11, 13

### Customer 1006 (Prime ID Amount Limit Test)
- Transaction with ID 17 for $10,000 and ID 19 for $9,999 (July 20, 2025)
- Tests: **Prime ID Rules** (Prime number IDs limited to $9,999 per day)
- Expected outcome: First transaction rejected (exceeds $9,999), second transaction accepted
- Transaction IDs: 17, 19

### Customer 1007 (Monday Multiplier Test)
- 3 transactions of $2,500 each on Monday (July 21, 2025)
- Tests: **Monday Multiplier** (Monday transactions count as 2x their value)
- Expected outcome: First transaction accepted, remaining transactions rejected (effective amount would be $15,000, exceeding daily limit)
- Transaction IDs: 1021, 1022, 1023

### Customer 1008 (Weekly Limit with High Amounts)
- $4,000 per day for 8 consecutive days (July 14-21, 2025)
- Tests: **Weekly Limit** with higher daily amounts
- Expected outcome: First transactions accepted until weekly limit is reached, then rejected
- Transaction IDs: 1024-1031

### Customer 1009 (Weekly Limit with Monday Multiplier)
- $3,000 per day for 8 consecutive days including two Mondays (July 21-28, 2025)
- Tests: **Weekly Limit** combined with **Monday Multiplier**
- Expected outcome: Transactions rejected earlier due to Monday multiplier effect on weekly limit
- Transaction IDs: 1032-1039

### Customer 1010 (Daily Limit Exact Edge Case)
- Transactions of $4,999, $1, and $1 on the same day (July 20, 2025)
- Tests: **Daily Limit** edge case (exactly at the limit + $1)
- Expected outcome: First two transactions accepted (totaling $5,000), third transaction rejected
- Transaction IDs: 1040, 1041, 1042

### Customer 1011 (Monday Multiplier with Multiple Transactions)
- 4 transactions of $2,000 each on Monday (July 21, 2025)
- Tests: **Monday Multiplier** with multiple transactions
- Expected outcome: First transaction accepted, remaining transactions rejected (effective amount would be $16,000, exceeding daily limit)
- Transaction IDs: 1043, 1044, 1045, 1046

### Customer 1012 (Daily Load Count with Minimal Amounts)
- 4 transactions of $1 each on the same day (July 20, 2025)
- Tests: **Daily Load Count** with minimal amounts
- Expected outcome: First 3 transactions accepted, 4th transaction rejected
- Transaction IDs: 1470, 1480, 1490, 1500

### Customer 1013 (Weekly Limit Edge Case)
- $20,000 in 4 days (July 14–17, 2025), $5k at the end of the week, and $5k a day later
- Tests: **Weekly Limit** edge case (exactly at the limit)
- Expected outcome: All except fifth transactions accepted
- Transaction IDs: 1051, 1052, 1053, 1054, 1055, 1056
