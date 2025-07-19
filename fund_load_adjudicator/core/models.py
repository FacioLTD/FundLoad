"""
Data models for the Fund Load Adjudication System.
Clean, type-safe models with validation.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from decimal import Decimal


@dataclass
class Transaction:
    """
    Represents a fund load transaction with validation.
    
    ASSUMPTIONS:
    - id and customer_id must be digit strings
    - load_amount is a string like "$123.45" or "USD$123.45"
    - time is UTC format ending with 'Z'
    """
    
    id: str
    customer_id: str
    load_amount: str
    time: str
    
    def __post_init__(self) -> None:
        """Validate transaction data after initialization."""
        if not isinstance(self.id, str) or not self.id.isdigit():
            raise ValueError(f"Invalid transaction ID: {self.id}")
        if not isinstance(self.customer_id, str) or not self.customer_id.isdigit():
            raise ValueError(f"Invalid customer ID: {self.customer_id}")
        if not isinstance(self.load_amount, str):
            raise ValueError(f"Invalid amount format: {self.load_amount}")
        if not isinstance(self.time, str) or not self.time.endswith('Z'):
            raise ValueError(f"Invalid timestamp format: {self.time}")


@dataclass
class RuleResult:
    """
    Result of a business rule evaluation.
    
    Attributes:
        passed: Whether the rule passed
        reason: Human-readable reason for the result
        details: Additional details about the evaluation
    """
    
    passed: bool
    reason: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


@dataclass
class ProcessingResult:
    """
    Result of processing a single transaction.
    
    Attributes:
        id: Transaction ID
        customer_id: Customer ID
        accepted: Whether transaction was accepted
        original_amount: Original transaction amount
        effective_amount: Amount after Monday multiplier
        is_monday: Whether transaction occurred on Monday
        rules_evaluated: Results of all rule evaluations
        time: Original transaction timestamp
        error: Error message if processing failed
    """
    
    id: str
    customer_id: str
    accepted: bool
    original_amount: str
    effective_amount: str
    is_monday: bool
    rules_evaluated: Dict[str, Dict[str, Any]]
    time: Optional[str] = None
    error: Optional[str] = None


@dataclass
class Configuration:
    """
    System configuration with business rules.
    
    ASSUMPTIONS:
    - All limits are Decimal for financial precision
    - Monday multiplier applies 2x to transaction amounts
    - Prime ID rules apply special limits to prime number IDs
    """
    
    daily_limit: Decimal
    weekly_limit: Decimal
    daily_load_count: int
    prime_id_daily_limit: Decimal
    prime_id_daily_count: int
    monday_multiplier: int
    min_customer_id_length: int
    min_transaction_id_length: int
    
    @classmethod
    def default(cls) -> "Configuration":
        """Create default configuration."""
        return cls(
            daily_limit=Decimal("5000.00"),
            weekly_limit=Decimal("20000.00"),
            daily_load_count=3,
            prime_id_daily_limit=Decimal("9999.00"),  # Note: This is hardcoded in PrimeIdRule
            prime_id_daily_count=1,  # Note: This is hardcoded in PrimeIdRule (government regulation)
            monday_multiplier=2,
            min_customer_id_length=3,
            min_transaction_id_length=3,
        ) 