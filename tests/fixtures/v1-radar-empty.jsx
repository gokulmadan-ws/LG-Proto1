// V1 fixture (never shipped): the real Renewal radar drawn from an estate whose radar groups are emptied, to prove the empty states.
//   #/renewals?empty=m6            the "3 to 6 months" band has no contracts
//   #/renewals?empty=m3,m6,m12     every band is empty (the lanes panel shows three empty bands)
//   #/renewals?empty=attention     nothing needs attention now (passed and ended are empty)
//   node scripts/build.mjs --entry tests/fixtures/v1-radar-empty.jsx --outdir .scratch/V1-empty
// Uses the same AppFrame (providers, shell, banner) as the app and passes the doctored estate to the named RenewalRadar export.
import '../../src/shell/shell.css';
import '../../src/ui/kit.css';
import '../../src/charts/charts.css';
import '../../src/styles/app.css';
import { createRoot } from 'react-dom/client';
import { AppFrame } from '../../src/shell/AppFrame.jsx';
import { useEstate } from '../../src/lib/estate.js';
import { useRoute } from '../../src/lib/router.js';
import { RenewalRadar } from '../../src/views/Renewals.jsx';

const emptied = (g) => ({ ...g, count: 0, annualGBP: 0, totalGBP: 0, items: [] });

function Fixture() {
  const { estate } = useEstate();
  const route = useRoute();
  const wanted = (route.query.get('empty') || '').split(',').filter(Boolean);
  const groups = { ...estate.radar.groups };
  wanted.forEach((k) => {
    if (k === 'attention') { groups.passed = emptied(groups.passed); groups.ended = emptied(groups.ended); } else if (groups[k]) groups[k] = emptied(groups[k]);
  });
  const radar = { ...estate.radar, groups, attention: wanted.includes('attention') ? [] : estate.radar.attention };
  return <RenewalRadar estate={{ ...estate, radar }} />;
}

createRoot(document.getElementById('root')).render(<AppFrame rail="renewals" title="Renewal radar"><Fixture /></AppFrame>);
