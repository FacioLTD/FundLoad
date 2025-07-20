"""
Business rules for the Fund Load Adjudication System.
Each rule is a separate, testable class with clear responsibilities.
"""

from collections import defaultdict, deque
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any

from .models import RuleResult, Configuration
from .validators import DateUtils, PrimeNumberChecker


class DailyLimitRule:
    """
    Enforces daily spending limit per customer.
    
    ASSUMPTION: Declined transactions do not count towards customer totals
    """
    
    def __init__(self, limit: Decimal):
        self.limit = limit
        self.customer_daily_totals: Dict[str, Dict[str, Decimal]] = defaultdict(
            lambda: defaultdict(Decimal)
        )
    
    def evaluate(self, customer_id: str, date: str, amount: Decimal) -> RuleResult:
        """
        Evaluate daily limit rule.
        
        Args:
            customer_id: Customer identifier
            date: Transaction date (YYYY-MM-DD)
            amount: Transaction amount
            
        Returns:
            RuleResult with evaluation outcome
        """
        current_total = self.customer_daily_totals[customer_id][date]
        new_total = current_total + amount
        
        if new_total > self.limit:
            return RuleResult(
                passed=False,
                reason="DAILY_LIMIT_EXCEEDED",
                details={
                    'current_daily_total': str(current_total),
                    'attempted': str(amount),
                    'limit': str(self.limit)
                }
            )
        
        return RuleResult(
            passed=True,
            details={
                'current_daily_total': str(current_total),
                'attempted': str(amount)
            }
        )
    
    def record_transaction(self, customer_id: str, date: str, amount: Decimal) -> None:
        """Record accepted transaction in daily totals."""
        self.customer_daily_totals[customer_id][date] += amount


class DailyCountRule:
    """
    Enforces daily transaction count limit per customer.
    
    ASSUMPTION: Declined transactions do not count towards customer totals
    """
    
    def __init__(self, limit: int):
        self.limit = limit
        self.customer_daily_counts: Dict[str, Dict[str, int]] = defaultdict(
            lambda: defaultdict(int)
        )
    
    def evaluate(self, customer_id: str, date: str) -> RuleResult:
        """
        Evaluate daily count rule.
        
        Args:
            customer_id: Customer identifier
            date: Transaction date (YYYY-MM-DD)
            
        Returns:
            RuleResult with evaluation outcome
        """
        current_count = self.customer_daily_counts[customer_id][date]
        
        if current_count >= self.limit:
            return RuleResult(
                passed=False,
                reason="DAILY_COUNT_EXCEEDED",
                details={'current_daily_count': current_count, 'limit': self.limit}
            )
        
        return RuleResult(
            passed=True,
            details={'current_daily_count': current_count}
        )
    
    def record_transaction(self, customer_id: str, date: str) -> None:
        """Record accepted transaction in daily count."""
        self.customer_daily_counts[customer_id][date] += 1


class WeeklyLimitRule:
    """
    Enforces weekly spending limit per customer using rolling window.
    
    ASSUMPTION: Weekly window is rolling 7-day window including today
    """
    
    def __init__(self, limit: Decimal):
        self.limit = limit
        self.customer_weekly_transactions: Dict[str, deque] = defaultdict(deque)
    
    def evaluate(self, customer_id: str, transaction_date: datetime, amount: Decimal) -> RuleResult:
        """
        Evaluate weekly limit rule using rolling 7-day window.
        
        Args:
            customer_id: Customer identifier
            transaction_date: Transaction datetime
            amount: Transaction amount
            
        Returns:
            RuleResult with evaluation outcome
        """
        # Get rolling week dates
        week_dates = set(DateUtils.get_rolling_week_dates(transaction_date))
        
        # Clean old transactions outside rolling window
        transactions = self.customer_weekly_transactions[customer_id]
        while transactions and transactions[0][0] not in week_dates:
            transactions.popleft()
        
        # Calculate current weekly total
        current_total = sum(amount for date, amount in transactions if date in week_dates)
        new_total = current_total + amount
        
        if new_total > self.limit:
            return RuleResult(
                passed=False,
                reason="WEEKLY_LIMIT_EXCEEDED",
                details={
                    'rolling_7d_total': str(current_total),
                    'attempted': str(amount),
                    'limit': str(self.limit)
                }
            )
        
        return RuleResult(
            passed=True,
            details={
                'rolling_7d_total': str(current_total),
                'attempted': str(amount)
            }
        )
    
    def record_transaction(self, customer_id: str, date: str, amount: Decimal) -> None:
        """Record accepted transaction in weekly totals."""
        self.customer_weekly_transactions[customer_id].append((date, amount))


class AnomalyRule:
    """
    Detects anomalies in transaction patterns.
    
    ASSUMPTION: Anomalies are detected based on unusual patterns
    """
    
    def __init__(self, min_customer_id: int = 3, min_transaction_id: int = 3):
        self.min_customer_id = min_customer_id
        self.min_transaction_id = min_transaction_id
        self.customer_transaction_counts: Dict[str, int] = defaultdict(int)
        self.transaction_id_counts: Dict[str, int] = defaultdict(int)
    
    def evaluate(self, customer_id: str, transaction_id: str) -> RuleResult:
        """
        Evaluate anomaly detection rules.
        
        Args:
            customer_id: Customer identifier
            transaction_id: Transaction identifier
            
        Returns:
            RuleResult with evaluation outcome
        """
        # Check customer ID minimum length
        if len(customer_id) < self.min_customer_id:
            return RuleResult(
                passed=False,
                reason="CUSTOMER_ID_TOO_SHORT",
                details={
                    'customer_id_length': len(customer_id),
                    'minimum_length': self.min_customer_id
                }
            )
        
        # Check transaction ID minimum length
        if len(transaction_id) < self.min_transaction_id:
            return RuleResult(
                passed=False,
                reason="TRANSACTION_ID_TOO_SHORT",
                details={
                    'transaction_id_length': len(transaction_id),
                    'minimum_length': self.min_transaction_id
                }
            )
        
        # Check for unusual transaction patterns
        customer_count = self.customer_transaction_counts[customer_id]
        transaction_count = self.transaction_id_counts[transaction_id]
        
        # Flag as anomaly if customer has too many transactions or transaction ID is reused
        if customer_count > 10:  # Arbitrary threshold
            return RuleResult(
                passed=False,
                reason="CUSTOMER_ANOMALY_DETECTED",
                details={
                    'customer_transaction_count': customer_count,
                    'threshold': 10
                }
            )
        
        if transaction_count > 0:  # Transaction ID should be unique
            return RuleResult(
                passed=False,
                reason="DUPLICATE_TRANSACTION_ID",
                details={
                    'transaction_id_count': transaction_count
                }
            )
        
        return RuleResult(
            passed=True,
            reason="NO_ANOMALY_DETECTED",
            details={
                'customer_transaction_count': customer_count,
                'transaction_id_count': transaction_count
            }
        )
    
    def record_transaction(self, customer_id: str, transaction_id: str) -> None:
        """Record transaction for anomaly detection."""
        self.customer_transaction_counts[customer_id] += 1
        self.transaction_id_counts[transaction_id] += 1


class PrimeIdRule:
    """
    Enforces special rules for prime number IDs.
    
    ASSUMPTION: Due to new government regulations, any 'id' which is a prime number 
    can only transact once per day with a maximum of $9,999 per day.
    """
    
    def __init__(self, daily_limit: Decimal = None, daily_count: int = None):
        # Use configuration values or defaults
        self.daily_limit = daily_limit if daily_limit is not None else Decimal("9999.00")
        self.daily_count = daily_count if daily_count is not None else 1
        self.prime_id_daily_totals: Dict[str, Dict[str, Decimal]] = defaultdict(
            lambda: defaultdict(Decimal)
        )
        self.prime_id_daily_counts: Dict[str, Dict[str, int]] = defaultdict(
            lambda: defaultdict(int)
        )
    
    def evaluate(self, customer_id: str, date: str, amount: Decimal) -> RuleResult:
        """
        Evaluate prime ID rules.
        
        Args:
            customer_id: Customer identifier
            date: Transaction date (YYYY-MM-DD)
            amount: Transaction amount
            
        Returns:
            RuleResult with evaluation outcome
        """
        # Check daily count limit
        current_count = self.prime_id_daily_counts[customer_id][date]
        if current_count >= self.daily_count:
            return RuleResult(
                passed=False,
                reason="PRIME_ID_DAILY_COUNT_EXCEEDED",
                details={'prime_id_daily_count': current_count, 'limit': self.daily_count}
            )
        
        # Check daily amount limit
        current_total = self.prime_id_daily_totals[customer_id][date]
        new_total = current_total + amount
        
        if new_total > self.daily_limit:
            return RuleResult(
                passed=False,
                reason="PRIME_ID_DAILY_LIMIT_EXCEEDED",
                details={
                    'prime_id_daily_total': str(current_total),
                    'attempted': str(amount),
                    'limit': str(self.daily_limit)
                }
            )
        
        return RuleResult(
            passed=True,
            reason="PRIME_ID_APPROVED",
            details={
                'prime_id_daily_count': current_count,
                'prime_id_daily_total': str(current_total),
                'attempted': str(amount)
            }
        )
    
    def record_transaction(self, customer_id: str, date: str, amount: Decimal) -> None:
        """Record accepted prime ID transaction."""
        self.prime_id_daily_totals[customer_id][date] += amount
        self.prime_id_daily_counts[customer_id][date] += 1


class RuleEngine:
    """
    Orchestrates all business rules for transaction processing.
    
    Provides a clean interface for evaluating all rules and recording
    accepted transactions.
    """
    
    def __init__(self, config: Configuration):
        """
        Initialize rule engine with configuration.
        
        Args:
            config: System configuration
        """
        self.daily_limit_rule = DailyLimitRule(config.daily_limit)
        self.daily_count_rule = DailyCountRule(config.daily_load_count)
        self.weekly_limit_rule = WeeklyLimitRule(config.weekly_limit)
        self.prime_id_rule = PrimeIdRule(
            daily_limit=config.prime_id_daily_limit,
            daily_count=config.prime_id_daily_count
        )
        self.anomaly_rule = AnomalyRule(min_customer_id=config.min_customer_id_length, min_transaction_id=config.min_transaction_id_length)
    
    def evaluate_all_rules(
        self, 
        customer_id: str, 
        transaction_id: str, 
        date: str, 
        transaction_date: datetime, 
        amount: Decimal
    ) -> Dict[str, RuleResult]:
        """
        Evaluate all business rules for a transaction.
        
        Args:
            customer_id: Customer identifier
            transaction_id: Transaction identifier
            date: Transaction date (YYYY-MM-DD)
            transaction_date: Transaction datetime
            amount: Transaction amount
            
        Returns:
            Dictionary of rule results
        """
        if not PrimeNumberChecker.is_prime(transaction_id):
            return {
                'daily_limit': self.daily_limit_rule.evaluate(customer_id, date, amount),
                'daily_count': self.daily_count_rule.evaluate(customer_id, date),
                'weekly_limit': self.weekly_limit_rule.evaluate(customer_id, transaction_date, amount),
                'prime_id': RuleResult(passed=True, reason="NOT_PRIME_ID"),
                'anomaly': self.anomaly_rule.evaluate(customer_id, transaction_id),
            }
        else:
            return {
                'daily_limit': RuleResult(passed=True, reason="PRIME_ID"),
                'daily_count': RuleResult(passed=True, reason="PRIME_ID"),
                'weekly_limit': self.weekly_limit_rule.evaluate(customer_id, transaction_date, amount),
                'prime_id': self.prime_id_rule.evaluate(customer_id, date, amount),
                'anomaly': self.anomaly_rule.evaluate(customer_id, transaction_id),
            }

    def record_accepted_transaction(
        self, 
        customer_id: str, 
        transaction_id: str, 
        date: str, 
        amount: Decimal
    ) -> None:
        """
        Record an accepted transaction in all rule engines.
        
        Args:
            customer_id: Customer identifier
            transaction_id: Transaction identifier
            date: Transaction date (YYYY-MM-DD)
            amount: Transaction amount
        """
        self.daily_limit_rule.record_transaction(customer_id, date, amount)
        self.daily_count_rule.record_transaction(customer_id, date)
        self.weekly_limit_rule.record_transaction(customer_id, date, amount)
        self.prime_id_rule.record_transaction(customer_id, date, amount)
        self.anomaly_rule.record_transaction(customer_id, transaction_id) 