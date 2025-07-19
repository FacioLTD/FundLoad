"""
Main processor for the Fund Load Adjudication System.
Orchestrates transaction processing with clean, streaming input/output.
"""

import json
import csv
import sys
from typing import Iterator, List, Dict, Any
from pathlib import Path

from .models import Transaction, ProcessingResult, Configuration
from .rules import RuleEngine
from .validators import AmountParser, DateUtils, MondayMultiplier


class FundProcessor:
    """
    Main processor for fund load adjudication.
    
    Handles streaming input/output and orchestrates all business rules.
    Designed for both simple file processing and API integration.
    """
    
    def __init__(self, config: Configuration = None):
        """
        Initialize processor with configuration.
        
        Args:
            config: System configuration (uses default if None)
        """
        self.config = config or Configuration.default()
        self.rule_engine = RuleEngine(self.config)
        self.monday_multiplier = MondayMultiplier(self.config.monday_multiplier)
    
    def process_transaction(self, transaction: Transaction) -> ProcessingResult:
        """
        Process a single transaction through all business rules.
        
        Args:
            transaction: Transaction to process
            
        Returns:
            ProcessingResult with outcome and details
        """
        try:
            # Parse amount and apply Monday multiplier
            amount = AmountParser.parse(transaction.load_amount)
            transaction_date = DateUtils.parse_timestamp(transaction.time)
            effective_amount, is_monday = self.monday_multiplier.apply(transaction_date, amount)
            date_str = DateUtils.get_date_string(transaction_date)
            
            # Evaluate all business rules
            rule_results = self.rule_engine.evaluate_all_rules(
                customer_id=transaction.customer_id,
                transaction_id=transaction.id,
                date=date_str,
                transaction_date=transaction_date,
                amount=effective_amount
            )
            
            # Determine if transaction is accepted (only business rules cause rejections, anomalies are informational)
            business_rules = ['daily_limit', 'daily_count', 'weekly_limit', 'prime_id']
            business_rule_results = {rule: rule_results[rule] for rule in business_rules if rule in rule_results}
            accepted = all(result.passed for result in business_rule_results.values())
            
            # Record transaction if accepted
            if accepted:
                self.rule_engine.record_accepted_transaction(
                    customer_id=transaction.customer_id,
                    transaction_id=transaction.id,
                    date=date_str,
                    amount=effective_amount
                )
            
            # Convert rule results to serializable format
            rules_evaluated = {
                rule_name: {
                    'passed': result.passed,
                    'reason': result.reason,
                    'details': result.details
                }
                for rule_name, result in rule_results.items()
            }
            
            # Format effective amount - don't add $ if original already has it
            if transaction.load_amount.startswith('$'):
                effective_amount_str = f"${effective_amount:.2f}"
            else:
                effective_amount_str = f"{effective_amount:.2f}"
            
            return ProcessingResult(
                id=transaction.id,
                customer_id=transaction.customer_id,
                accepted=accepted,
                original_amount=transaction.load_amount,
                effective_amount=effective_amount_str,
                is_monday=is_monday,
                rules_evaluated=rules_evaluated,
                time=transaction.time
            )
            
        except Exception as e:
            return ProcessingResult(
                id=transaction.id,
                customer_id=transaction.customer_id,
                accepted=False,
                original_amount=transaction.load_amount,
                effective_amount=transaction.load_amount,
                is_monday=False,
                rules_evaluated={},
                time=transaction.time,
                error=str(e)
            )
    
    def _detect_file_format(self, input_path: str) -> str:
        """
        Detect if file is CSV or JSONL based on first line.
        
        Args:
            input_path: Path to input file
            
        Returns:
            'csv' or 'jsonl'
        """
        try:
            with open(input_path, 'r') as f:
                first_line = f.readline().strip()
                if first_line.startswith('{') and first_line.endswith('}'):
                    return 'jsonl'
                elif ',' in first_line:
                    return 'csv'
                else:
                    # Default to JSONL for backward compatibility
                    return 'jsonl'
        except Exception:
            return 'jsonl'
    
    def _parse_csv_line(self, line: str, headers: List[str]) -> Dict[str, str]:
        """
        Parse a CSV line into a transaction dictionary.
        
        Args:
            line: CSV line
            headers: Column headers
            
        Returns:
            Transaction data dictionary
        """
        reader = csv.reader([line])
        values = next(reader)
        
        if len(values) != len(headers):
            raise ValueError(f"CSV line has {len(values)} values but expected {len(headers)} headers")
        
        transaction_data = {}
        for header, value in zip(headers, values):
            # Map common field names to expected model fields
            if header.lower() in ['amount', 'load_amount', 'transaction_amount']:
                transaction_data['load_amount'] = value.strip()
            elif header.lower() in ['customer_id', 'customerid', 'customer']:
                transaction_data['customer_id'] = value.strip()
            elif header.lower() in ['id', 'transaction_id', 'transactionid']:
                transaction_data['id'] = value.strip()
            elif header.lower() in ['time', 'timestamp', 'date', 'datetime']:
                transaction_data['time'] = value.strip()
            else:
                transaction_data[header] = value.strip()
        
        return transaction_data
    
    def process_file(self, input_path: str, output_path: str = None) -> List[ProcessingResult]:
        """
        Process transactions from input file and write results to output file.
        
        Args:
            input_path: Path to input file
            output_path: Path to output file (defaults to stdout)
            
        Returns:
            List of processing results
        """
        results = []
        file_format = self._detect_file_format(input_path)
        
        if file_format == 'csv':
            # Process CSV file
            with open(input_path, 'r', newline='') as input_file:
                csv_reader = csv.reader(input_file)
                headers = next(csv_reader)  # Read header row
                
                for line_num, row in enumerate(csv_reader, 2):  # Start from 2 since we read header
                    if not row or all(not cell.strip() for cell in row):
                        continue
                    
                    try:
                        # Parse CSV row
                        transaction_data = self._parse_csv_line(','.join(row), headers)
                        transaction = Transaction(**transaction_data)
                        
                        # Process transaction
                        result = self.process_transaction(transaction)
                        results.append(result)
                        
                    except Exception as e:
                        # Re-raise validation errors to stop processing
                        raise ValueError(f"Validation error on CSV line {line_num}: {e}")
        else:
            # Process JSONL file
            with open(input_path, 'r') as input_file:
                for line_num, line in enumerate(input_file, 1):
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        # Parse JSON transaction
                        transaction_data = json.loads(line)
                        transaction = Transaction(**transaction_data)
                        
                        # Process transaction
                        result = self.process_transaction(transaction)
                        results.append(result)
                        
                    except json.JSONDecodeError as e:
                        raise ValueError(f"JSON parsing error on line {line_num}: {e}")
                    except Exception as e:
                        # Re-raise validation errors to stop processing
                        raise ValueError(f"Validation error on line {line_num}: {e}")
        
        # Write results
        if output_path:
            with open(output_path, 'w') as output_file:
                for result in results:
                    output_line = {
                        'id': result.id,
                        'customer_id': result.customer_id,
                        'accepted': result.accepted
                    }
                    output_file.write(json.dumps(output_line) + '\n')
        else:
            # Write to stdout
            for result in results:
                output_line = {
                    'id': result.id,
                    'customer_id': result.customer_id,
                    'accepted': result.accepted
                }
                print(json.dumps(output_line))
        
        return results
    
    def process_stream(self, input_stream: Iterator[str], format_type: str = 'jsonl') -> Iterator[Dict[str, Any]]:
        """
        Process transactions from a stream and yield results.
        
        Args:
            input_stream: Iterator of transaction strings
            format_type: 'csv' or 'jsonl'
            
        Yields:
            Processing results as dictionaries
        """
        if format_type == 'csv':
            # Process CSV stream
            csv_reader = csv.reader(input_stream)
            headers = next(csv_reader)  # Read header row
            
            for row in csv_reader:
                if not row or all(not cell.strip() for cell in row):
                    continue
                
                try:
                    # Parse CSV row
                    transaction_data = self._parse_csv_line(','.join(row), headers)
                    transaction = Transaction(**transaction_data)
                    
                    # Process transaction
                    result = self.process_transaction(transaction)
                    
                    # Yield simplified result
                    yield {
                        'id': result.id,
                        'customer_id': result.customer_id,
                        'accepted': result.accepted
                    }
                    
                except Exception as e:
                    # Yield error result
                    yield {
                        'id': 'unknown',
                        'customer_id': 'unknown',
                        'accepted': False,
                        'error': str(e)
                    }
        else:
            # Process JSONL stream
            for line in input_stream:
                line = line.strip()
                if not line:
                    continue
                
                try:
                    # Parse JSON transaction
                    transaction_data = json.loads(line)
                    transaction = Transaction(**transaction_data)
                    
                    # Process transaction
                    result = self.process_transaction(transaction)
                    
                    # Yield simplified result
                    yield {
                        'id': result.id,
                        'customer_id': result.customer_id,
                        'accepted': result.accepted
                    }
                    
                except Exception as e:
                    # Yield error result
                    yield {
                        'id': 'unknown',
                        'customer_id': 'unknown',
                        'accepted': False,
                        'error': str(e)
                    }
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get processing statistics for monitoring/debugging.
        
        Returns:
            Dictionary with current system state
        """
        return {
            'configuration': {
                'daily_limit': str(self.config.daily_limit),
                'weekly_limit': str(self.config.weekly_limit),
                'daily_load_count': self.config.daily_load_count,
                'prime_id_daily_limit': str(self.config.prime_id_daily_limit),
                'prime_id_daily_count': self.config.prime_id_daily_count,
                'monday_multiplier': self.config.monday_multiplier,
            },
            'rule_engine_state': {
                'daily_limit_customers': len(self.rule_engine.daily_limit_rule.customer_daily_totals),
                'daily_count_customers': len(self.rule_engine.daily_count_rule.customer_daily_counts),
                'weekly_limit_customers': len(self.rule_engine.weekly_limit_rule.customer_weekly_transactions),
                'prime_id_transactions': len(self.rule_engine.prime_id_rule.prime_id_daily_totals),
            }
        } 