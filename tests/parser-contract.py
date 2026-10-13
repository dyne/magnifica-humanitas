"""Negative parser checks guard against silently accepting source damage."""
import importlib.util
from pathlib import Path
import json
spec = importlib.util.spec_from_file_location('ingest', Path('scripts/ingest-source.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
raw = (m.SOURCE/'pdf-layout.txt').read_text()
structure = json.loads((m.SOURCE/'structure.json').read_text())
for label, damaged in [
    ('missing heading',raw.replace('An examen for the Church','[BROKEN HEADING]')),
    ('missing paragraph',raw.replace('     244.','     [MISSING244].')),
    ('duplicate paragraph',raw.replace('     245.','     244.')),
    ('missing note',raw.replace('[158]Cf.','[MISSING158]Cf.')),
]:
    try:
        m.parse_pdf(damaged,structure)
    except (ValueError, AssertionError):
        continue
    raise AssertionError(f'Parser accepted {label}')
print('4 damaged inputs rejected')
