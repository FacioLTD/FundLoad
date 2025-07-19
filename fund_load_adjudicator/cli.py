"""
Command-line interface for the Fund Load Adjudication System.
Clean, simple CLI that follows Unix principles.
"""

import argparse
import sys
from pathlib import Path

from .core.processor import FundProcessor
from .core.models import Configuration


def main():
    """
    Main CLI entry point.
    
    Usage:
        fund-adjudicator input.txt output.txt
        fund-adjudicator input.txt  # Output to stdout
        fund-adjudicator --help     # Show help
    """
    parser = argparse.ArgumentParser(
        description="Fund Load Adjudication System - By Uriel Aharoni",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s input.txt output.txt     # Process file and save results
  %(prog)s input.txt               # Process file and print to stdout
  %(prog)s --test                  # Run built-in test cases
  %(prog)s --stats input.txt       # Show processing statistics
        """
    )
    
    parser.add_argument(
        'input_file',
        nargs='?',
        help='Input file with JSON transactions (one per line)'
    )
    
    parser.add_argument(
        'output_file',
        nargs='?',
        help='Output file for results (defaults to stdout)'
    )
    
    parser.add_argument(
        '--test',
        action='store_true',
        help='Run built-in test cases'
    )
    
    parser.add_argument(
        '--stats',
        action='store_true',
        help='Show processing statistics'
    )
    
    parser.add_argument(
        '--config',
        help='Configuration file (JSON format)'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Verbose output'
    )
    
    args = parser.parse_args()
    
    # Handle test mode
    if args.test:
        run_tests()
        return
    
    # Validate input
    if not args.input_file:
        parser.error("Input file is required (unless using --test)")
    
    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"Error: Input file '{input_path}' not found", file=sys.stderr)
        sys.exit(1)
    
    # Load configuration
    config = load_configuration(args.config)
    
    # Create processor
    processor = FundProcessor(config)
    
    # Process file
    try:
        results = processor.process_file(
            input_path=str(input_path),
            output_path=args.output_file
        )
        
        # Show statistics if requested
        if args.stats:
            show_statistics(processor, results, args.verbose)
        
        # Show summary
        if args.verbose:
            show_summary(results)
        
    except Exception as e:
        print(f"Error processing file: {e}", file=sys.stderr)
        sys.exit(1)


def load_configuration(config_path: str = None) -> Configuration:
    """
    Load configuration from file or use defaults.
    
    Args:
        config_path: Path to configuration file
        
    Returns:
        Configuration object
    """
    if not config_path:
        return Configuration.default()
    
    try:
        import json
        with open(config_path, 'r') as f:
            config_data = json.load(f)
        
        return Configuration(**config_data)
    except Exception as e:
        print(f"Warning: Could not load config from '{config_path}': {e}", file=sys.stderr)
        print("Using default configuration", file=sys.stderr)
        return Configuration.default()


def show_statistics(processor: FundProcessor, results: list, verbose: bool = False):
    """
    Display processing statistics.
    
    Args:
        processor: Fund processor instance
        results: List of processing results
        verbose: Whether to show detailed statistics
    """
    stats = processor.get_statistics()
    
    print("\n=== PROCESSING STATISTICS ===")
    print(f"Total transactions processed: {len(results)}")
    print(f"Accepted: {sum(1 for r in results if r.accepted)}")
    print(f"Declined: {sum(1 for r in results if not r.accepted)}")
    
    if verbose:
        print(f"\nConfiguration:")
        for key, value in stats['configuration'].items():
            print(f"  {key}: {value}")
        
        print(f"\nRule Engine State:")
        for key, value in stats['rule_engine_state'].items():
            print(f"  {key}: {value}")


def show_summary(results: list):
    """
    Show processing summary.
    
    Args:
        results: List of processing results
    """
    print(f"\n=== PROCESSING SUMMARY ===")
    print(f"Total transactions: {len(results)}")
    
    accepted = [r for r in results if r.accepted]
    declined = [r for r in results if not r.accepted]
    
    print(f"Accepted: {len(accepted)} ({len(accepted)/len(results)*100:.1f}%)")
    print(f"Declined: {len(declined)} ({len(declined)/len(results)*100:.1f}%)")
    
    # Show decline reasons
    if declined:
        print(f"\nDecline reasons:")
        reasons = {}
        for result in declined:
            for rule_name, rule_result in result.rules_evaluated.items():
                if not rule_result['passed']:
                    reason = rule_result.get('reason', 'UNKNOWN')
                    reasons[reason] = reasons.get(reason, 0) + 1
        
        for reason, count in sorted(reasons.items()):
            print(f"  {reason}: {count}")


def run_tests():
    """
    Run built-in test cases.
    """
    print("Running built-in test cases...")
    
    # Create test processor
    processor = FundProcessor()
    
    # Test transactions
    test_transactions = [
        {
            "id": "15337",
            "customer_id": "999",
            "load_amount": "$1000.00",
            "time": "2023-01-01T10:00:00Z"
        },
        {
            "id": "34781",
            "customer_id": "343",
            "load_amount": "$500.00",
            "time": "2023-01-01T11:00:00Z"
        },
        {
            "id": "26440",
            "customer_id": "222",
            "load_amount": "$2000.00",
            "time": "2023-01-01T12:00:00Z"
        }
    ]
    
    print("\nTest Results:")
    for i, transaction_data in enumerate(test_transactions, 1):
        from .core.models import Transaction
        transaction = Transaction(**transaction_data)
        result = processor.process_transaction(transaction)
        
        status = "✅ ACCEPTED" if result.accepted else "❌ DECLINED"
        print(f"  Test {i}: {status} - {transaction.id} (${transaction.load_amount})")
    
    print("\n✅ All tests completed!")


if __name__ == "__main__":
    main() 