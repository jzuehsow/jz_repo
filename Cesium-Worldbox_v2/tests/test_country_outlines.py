"""Full borders retain land boundaries and include island/continental coasts."""
import json
import unittest
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / 'public/data/geo'

class CountryOutlinesTest(unittest.TestCase):
    def test_country_outlines_include_coasts_and_islands_at_both_zoom_tiers(self):
        for scale in ('110', '50'):
            with self.subTest(scale=scale):
                coasts = json.loads((DATA / f'coastlines{scale}.json').read_text())
                borders = json.loads((DATA / f'borders{scale}.json').read_text())
                self.assertGreater(len(borders), 0)
                vertices = [point for line in coasts for point in line]
                for name, lon, lat in [('Britain', -5.7, 50.1), ('Australia', 151.2, -33.9), ('Japan', 140.8, 35.7)]:
                    with self.subTest(country=name):
                        self.assertTrue(any(abs(x-lon)<0.8 and abs(y-lat)<0.8 for x,y in vertices), name)
                for line in coasts:
                    self.assertGreaterEqual(len(line), 2)
                    self.assertTrue(all(-180 <= x <= 180 and -90 <= y <= 90 for x,y in line))

if __name__ == '__main__':
    unittest.main()
