#!/usr/bin/env python3
"""Acquisition witnesses fail closed before a snapshot becomes reader content."""
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('snapshots', ROOT / 'scripts/check-official-snapshots.py')
snapshots = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snapshots)


class SnapshotContract(unittest.TestCase):
    def test_all_official_artifacts_and_witnesses(self):
        snapshots.check()

    def test_error_page_is_not_a_document(self):
        with self.assertRaisesRegex(ValueError, 'paragraph numbers'):
            snapshots.inspect(b'<html lang="ar"><p>Service unavailable</p></html>')

    def test_corrupted_unicode_is_rejected(self):
        raw = (ROOT / 'content/source/ar/official.html').read_bytes()
        with self.assertRaisesRegex(ValueError, 'Replacement character'):
            snapshots.inspect(raw.replace('الإنسانيّة'.encode(), '\ufffd'.encode(), 1))

    def test_duplicate_and_missing_paragraph_are_rejected(self):
        raw = (ROOT / 'content/source/ru/official.html').read_bytes()
        for replacement in (b'2. ', b''):
            with self.subTest(replacement=replacement):
                with self.assertRaisesRegex(ValueError, 'paragraph numbers'):
                    snapshots.inspect(raw.replace(b'1. ', replacement, 1))


if __name__ == '__main__':
    unittest.main()
