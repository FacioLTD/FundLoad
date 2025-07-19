"""
Core functionality tests for the Fund Load Adjudication System.
"""

import pytest
from decimal import Decimal
from datetime import datetime

from fund_load_adjudicator.core.models import Transaction, Configuration
from fund_load_adjudicator.core.processor import FundProcessor
from fund_load_adjudicator.core.validators import AmountParser, PrimeNumberChecker, DateUtils


class TestAmountParser:
    """Test amount parsing functionality."""
    
    def test_parse_basic_amount(self):
        """Test parsing basic dollar amounts."""
        assert AmountParser.parse("$100.00") == Decimal("100.00")
        assert AmountParser.parse("$1,234.56") == Decimal("1234.56")
        assert AmountParser.parse("USD$500.00") == Decimal("500.00")
    
    def test_parse_invalid_amount(self):
        """Test parsing invalid amounts."""
        with pytest.raises(ValueError):
            AmountParser.parse("invalid")
        
        with pytest.raises(ValueError):
            AmountParser.parse("")


class TestPrimeNumberChecker:
    """Test prime number detection."""
    
    def test_prime_numbers(self):
        """Test known prime numbers."""
        assert PrimeNumberChecker.is_prime("2") is True
        assert PrimeNumberChecker.is_prime("3") is True
        assert PrimeNumberChecker.is_prime("5") is True
        assert PrimeNumberChecker.is_prime("7") is True
        assert PrimeNumberChecker.is_prime("11") is True
        assert PrimeNumberChecker.is_prime("13") is True
    
    def test_non_prime_numbers(self):
        """Test known non-prime numbers."""
        assert PrimeNumberChecker.is_prime("1") is False
        assert PrimeNumberChecker.is_prime("4") is False
        assert PrimeNumberChecker.is_prime("6") is False
        assert PrimeNumberChecker.is_prime("8") is False
        assert PrimeNumberChecker.is_prime("9") is False
        assert PrimeNumberChecker.is_prime("10") is False
    
    def test_invalid_input(self):
        """Test invalid input handling."""
        assert PrimeNumberChecker.is_prime("abc") is False
        assert PrimeNumberChecker.is_prime("") is False
        assert PrimeNumberChecker.is_prime("-1") is False


class TestDateUtils:
    """Test date utility functions."""
    
    def test_parse_timestamp(self):
        """Test timestamp parsing."""
        dt = DateUtils.parse_timestamp("2023-01-01T10:00:00Z")
        assert isinstance(dt, datetime)
        assert dt.year == 2023
        assert dt.month == 1
        assert dt.day == 1
        assert dt.hour == 10
    
    def test_get_date_string(self):
        """Test date string formatting."""
        dt = datetime(2023, 1, 1, 10, 0, 0)
        assert DateUtils.get_date_string(dt) == "2023-01-01"
    
    def test_is_monday(self):
        """Test Monday detection."""
        # 2023-01-02 is a Monday
        monday = datetime(2023, 1, 2, 10, 0, 0)
        assert DateUtils.is_monday(monday) is True
        
        # 2023-01-03 is a Tuesday
        tuesday = datetime(2023, 1, 3, 10, 0, 0)
        assert DateUtils.is_monday(tuesday) is False


class TestTransaction:
    """Test transaction model validation."""
    
    def test_valid_transaction(self):
        """Test valid transaction creation."""
        transaction = Transaction(
            id="12345",
            customer_id="999",
            load_amount="$100.00",
            time="2023-01-01T10:00:00Z"
        )
        assert transaction.id == "12345"
        assert transaction.customer_id == "999"
        assert transaction.load_amount == "$100.00"
        assert transaction.time == "2023-01-01T10:00:00Z"
    
    def test_invalid_transaction_id(self):
        """Test invalid transaction ID."""
        with pytest.raises(ValueError):
            Transaction(
                id="abc",
                customer_id="999",
                load_amount="$100.00",
                time="2023-01-01T10:00:00Z"
            )
    
    def test_invalid_customer_id(self):
        """Test invalid customer ID."""
        with pytest.raises(ValueError):
            Transaction(
                id="12345",
                customer_id="abc",
                load_amount="$100.00",
                time="2023-01-01T10:00:00Z"
            )
    
    def test_invalid_timestamp(self):
        """Test invalid timestamp."""
        with pytest.raises(ValueError):
            Transaction(
                id="12345",
                customer_id="999",
                load_amount="$100.00",
                time="invalid"
            )


class TestFundProcessor:
    """Test main processor functionality."""
    
    def test_processor_initialization(self):
        """Test processor initialization."""
        processor = FundProcessor()
        assert processor.config.daily_limit == Decimal("5000.00")
        assert processor.config.weekly_limit == Decimal("20000.00")
        assert processor.config.daily_load_count == 3
    
    def test_single_transaction_processing(self):
        """Test processing a single transaction."""
        processor = FundProcessor()
        
        transaction = Transaction(
            id="12345",
            customer_id="999",
            load_amount="$100.00",
            time="2023-01-01T10:00:00Z"
        )
        
        result = processor.process_transaction(transaction)
        
        assert result.id == "12345"
        assert result.customer_id == "999"
        assert result.accepted is True
        assert result.original_amount == "$100.00"
        assert result.effective_amount == "$100.00"
        assert result.is_monday is False
    
    def test_monday_multiplier(self):
        """Test Monday multiplier application."""
        processor = FundProcessor()
        
        # 2023-01-02 is a Monday
        transaction = Transaction(
            id="12345",
            customer_id="999",
            load_amount="$100.00",
            time="2023-01-02T10:00:00Z"
        )
        
        result = processor.process_transaction(transaction)
        
        assert result.is_monday is True
        assert result.effective_amount == "$200.00"
    
    def test_daily_limit_enforcement(self):
        """Test daily limit enforcement."""
        processor = FundProcessor()
        
        # First transaction should be accepted
        transaction1 = Transaction(
            id="12345",
            customer_id="999",
            load_amount="$4000.00",
            time="2023-01-01T10:00:00Z"
        )
        result1 = processor.process_transaction(transaction1)
        assert result1.accepted is True
        
        # Second transaction should be declined (exceeds daily limit)
        transaction2 = Transaction(
            id="12346",
            customer_id="999",
            load_amount="$2000.00",
            time="2023-01-01T11:00:00Z"
        )
        result2 = processor.process_transaction(transaction2)
        assert result2.accepted is False
    
    def test_daily_count_enforcement(self):
        """Test daily count enforcement."""
        processor = FundProcessor()
        
        # Process 3 transactions (should all be accepted)
        for i in range(3):
            transaction = Transaction(
                id=f"1234{i}",
                customer_id="999",
                load_amount="$100.00",
                time="2023-01-01T10:00:00Z"
            )
            result = processor.process_transaction(transaction)
            assert result.accepted is True
        
        # Fourth transaction should be declined (exceeds daily count)
        transaction4 = Transaction(
            id="12344",
            customer_id="999",
            load_amount="$100.00",
            time="2023-01-01T11:00:00Z"
        )
        result4 = processor.process_transaction(transaction4)
        assert result4.accepted is False
    
    def test_prime_id_rules(self):
        """Test prime ID special rules."""
        processor = FundProcessor()
        
        # Prime ID transaction within limits
        transaction1 = Transaction(
            id="2",  # Prime number
            customer_id="999",
            load_amount="$5000.00",
            time="2023-01-01T10:00:00Z"
        )
        result1 = processor.process_transaction(transaction1)
        assert result1.accepted is True
        
        # Prime ID transaction exceeding daily limit
        transaction2 = Transaction(
            id="2",  # Same prime number
            customer_id="999",
            load_amount="$6000.00",
            time="2023-01-01T11:00:00Z"
        )
        result2 = processor.process_transaction(transaction2)
        assert result2.accepted is False
    
    def test_weekly_limit_enforcement(self):
        """Test weekly limit enforcement."""
        processor = FundProcessor()
        
        # Process transactions over multiple days within weekly limit
        # Using dates that are not Mondays to avoid multiplier
        transactions = [
            ("2023-01-01T10:00:00Z", "$5000.00"),  # Sunday
            ("2023-01-03T10:00:00Z", "$5000.00"),  # Tuesday
            ("2023-01-05T10:00:00Z", "$5000.00"),  # Thursday
        ]
        
        for i, (time, amount) in enumerate(transactions):
            transaction = Transaction(
                id=f"1234{i}",
                customer_id="999",
                load_amount=amount,
                time=time
            )
            result = processor.process_transaction(transaction)
            assert result.accepted is True
        
        # Fourth transaction should be declined (exceeds weekly limit)
        transaction4 = Transaction(
            id="12344",
            customer_id="999",
            load_amount="$5001.00",  # This will exceed the $20,000 limit
            time="2023-01-06T10:00:00Z"  # Friday
        )
        result4 = processor.process_transaction(transaction4)
        assert result4.accepted is False


class TestConfiguration:
    """Test configuration model."""
    
    def test_default_configuration(self):
        """Test default configuration values."""
        config = Configuration.default()
        
        assert config.daily_limit == Decimal("5000.00")
        assert config.weekly_limit == Decimal("20000.00")
        assert config.daily_load_count == 3
        assert config.prime_id_daily_limit == Decimal("9999.00")
        assert config.prime_id_daily_count == 1
        assert config.monday_multiplier == 2
    
    def test_custom_configuration(self):
        """Test custom configuration creation."""
        config = Configuration(
            daily_limit=Decimal("10000.00"),
            weekly_limit=Decimal("50000.00"),
            daily_load_count=5,
            prime_id_daily_limit=Decimal("15000.00"),
            prime_id_daily_count=2,
            monday_multiplier=3,
            min_customer_id_length=3,
            min_transaction_id_length=3
        )
        
        assert config.daily_limit == Decimal("10000.00")
        assert config.weekly_limit == Decimal("50000.00")
        assert config.daily_load_count == 5
        assert config.prime_id_daily_limit == Decimal("15000.00")
        assert config.prime_id_daily_count == 2
        assert config.monday_multiplier == 3
        assert config.min_customer_id_length == 3
        assert config.min_transaction_id_length == 3 