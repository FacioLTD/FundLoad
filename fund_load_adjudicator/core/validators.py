"""
Validation and parsing utilities for the Fund Load Adjudication System.
Clean, focused functions for data validation and transformation.
"""

import re
import math
from datetime import datetime
from decimal import Decimal, ROUND_DOWN, getcontext
from typing import Tuple

# Configure decimal precision for financial calculations
getcontext().prec = 10
getcontext().rounding = ROUND_DOWN


class AmountParser:
    """
    Handles parsing and validation of monetary amounts.
    
    ASSUMPTION: Amounts are strings like "$123.45" or "USD$123.45"
    """
    
    @staticmethod
    def parse(amount_str: str) -> Decimal:
        """
        Parse amount string to Decimal.
        
        Args:
            amount_str: String representation of amount
            
        Returns:
            Decimal representation of amount
            
        Raises:
            ValueError: If amount format is invalid
        """
        # Remove commas and currency symbols
        cleaned = amount_str.replace(",", "").replace("$", "").replace("USD", "")
        
        # Extract numeric value (including decimal part)
        match = re.search(r"^\d+\.?\d*$", cleaned)
        if not match:
            raise ValueError(f'Malformed amount string: {amount_str}')
        
        return Decimal(match.group()).quantize(Decimal('0.01'))


class PrimeNumberChecker:
    """
    Handles prime number detection for special ID rules.
    
    ASSUMPTION: Prime number IDs get special treatment
    """
    
    @staticmethod
    def is_prime(n: str) -> bool:
        """
        Check if a string represents a prime number.
        
        Args:
            n: String representation of number
            
        Returns:
            True if prime, False otherwise
        """
        try:
            num = int(n)
        except (ValueError, TypeError):
            return False
            
        if num < 2:
            return False
        if num == 2:
            return True
        if num % 2 == 0:
            return False
            
        # Check odd numbers up to square root
        for i in range(3, int(math.sqrt(num)) + 1, 2):
            if num % i == 0:
                return False
        return True


class DateUtils:
    """
    Handles date parsing and utility functions.
    
    ASSUMPTIONS:
    - Timestamps are in UTC format ending with 'Z'
    - Monday detection uses ISO weekday (1 = Monday)
    - Weekly window is rolling 7-day window including today
    """
    
    @staticmethod
    def parse_timestamp(time_str: str) -> datetime:
        """
        Parse UTC timestamp string to datetime.
        
        Args:
            time_str: UTC timestamp string
            
        Returns:
            datetime object
        """
        # Handle missing timezone info
        if time_str.endswith('Z'):
            time_str = time_str[:-1] + '+00:00'
        
        return datetime.fromisoformat(time_str.replace('Z', '+00:00'))
    
    @staticmethod
    def get_date_string(dt: datetime) -> str:
        """Get date string in YYYY-MM-DD format."""
        return dt.strftime('%Y-%m-%d')
    
    @staticmethod
    def is_monday(dt: datetime) -> bool:
        """Check if date is Monday."""
        return dt.isoweekday() == 1
    
    @staticmethod
    def get_rolling_week_dates(current_date: datetime) -> list[str]:
        """Get list of dates for rolling 7-day window."""
        from datetime import timedelta
        return [(current_date - timedelta(days=i)).strftime('%Y-%m-%d') 
                for i in range(7)]


class MondayMultiplier:
    """
    Applies Monday multiplier to transaction amounts.
    
    ASSUMPTION: Monday multiplier applies 2x to transaction amounts
    """
    
    def __init__(self, multiplier: int = 2):
        self.multiplier = multiplier
    
    def apply(self, transaction_date: datetime, amount: Decimal) -> Tuple[Decimal, bool]:
        """
        Apply Monday multiplier to transaction amount.
        
        Args:
            transaction_date: Transaction datetime
            amount: Original transaction amount
            
        Returns:
            Tuple of (effective_amount, is_monday)
        """
        is_monday = DateUtils.is_monday(transaction_date)
        effective_amount = amount * self.multiplier if is_monday else amount
        
        return effective_amount, is_monday 