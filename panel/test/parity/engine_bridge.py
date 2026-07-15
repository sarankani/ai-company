#!/usr/bin/env python3
"""EX-604 parity bridge — expose a few pure functions of the Python engine so
the TS unit suite can assert the two engines agree byte-for-byte.

Usage (invoked by test/unit/parity.test.ts via child_process):
  parse-dump           < record.md      # parse_record then dump_record, to stdout
  sla <isoStart> <priority> [cadence]   # sla_due_from(...) -> iso string
  validate <path>                       # validate_one(path) -> "OK" or "INVALID: ..."
"""
import os
import sys

# import the real engine (scripts/approval_engine.py)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "scripts"))
import approval_engine as e  # noqa: E402


def main(argv):
    if not argv:
        print("usage: engine_bridge.py <parse-dump|sla|validate> ...", file=sys.stderr)
        return 2
    cmd = argv[0]
    if cmd == "parse-dump":
        data, body = e.parse_record(sys.stdin.read())
        sys.stdout.write(e.dump_record(data, body))
        return 0
    if cmd == "sla":
        start = e.parse_iso(argv[1])
        cadence = len(argv) > 3 and argv[3] == "cadence"
        # sla_due_from returns a datetime; iso() renders the canonical ...Z form
        print(e.iso(e.sla_due_from(start, argv[2], cadence)))
        return 0
    if cmd == "validate":
        errs = e.validate_one(argv[1])
        print("OK" if not errs else "\n".join(f"INVALID: {x}" for x in errs))
        return 0
    print(f"unknown command: {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
