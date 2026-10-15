// Both sides' named representatives, from clause 3 of the contract (action tracker build spec 8.6, data in src/data/representatives.js).
// Each shows the name, role, email, the clause and page, and the quote. The source viewer has no page 6, so the quote is shown here
// rather than linked. Sample names only.
import { representativesFor } from '../../data/representatives.js';
import { peopleById } from '../../data/people.js';
import { ACT } from '../../lib/actions-copy.js';
import { Panel } from '../../ui/index.js';
import { PersonAvatar } from '../../components/ActionBits.jsx';

export function RepresentativesPanel({ contract }) {
  const reps = representativesFor(contract.id);
  if (!reps) return null;
  const person = peopleById[reps.authority.personId];
  const rows = [
    { key: 'authority', label: ACT.reps.authority, name: person.name, role: person.role, email: person.email, initials: person.initials, src: reps.authority },
    { key: 'supplier', label: ACT.reps.supplier, name: reps.supplier.name, role: `${reps.supplier.role}, ${contract.supplierName}`, email: reps.supplier.email, initials: reps.supplier.name.split(' ').map((w) => w[0]).join(''), src: reps.supplier },
  ];
  return (
    <Panel as="h2" title={ACT.reps.title} description={ACT.reps.description} id="cd-reps-title" className="cd-reps">
      <ul className="cd-reps__list">
        {rows.map((r) => (
          <li key={r.key} className="cd-rep" data-rep={r.key}>
            <p className="cd-rep__label">{r.label}</p>
            <div className="cd-rep__who">
              <PersonAvatar person={{ initials: r.initials }} size={32} />
              <div className="cd-rep__text">
                <p className="cd-rep__name">{r.name}</p>
                <p className="cd-rep__role">{r.role}</p>
                <p className="cd-rep__email">{r.email}</p>
              </div>
            </div>
            <figure className="cd-rep__src">
              <figcaption className="kx-mono">{ACT.reps.clause(r.src.clauseRef, r.src.page)}</figcaption>
              <blockquote>{r.src.quote}</blockquote>
            </figure>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default RepresentativesPanel;
