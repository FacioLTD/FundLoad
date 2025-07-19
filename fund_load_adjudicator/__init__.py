"""
Fund Load Adjudication System
By Uriel Aharoni - Legendary FinTech Architect

A modular, production-ready system for processing fund load transactions
according to velocity limits and business rules.
"""

__version__ = "1.0.0"
__author__ = "Uriel Aharoni"

from .core.processor import FundProcessor
from .core.models import Transaction, RuleResult

__all__ = ["FundProcessor", "Transaction", "RuleResult"] 