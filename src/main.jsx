import './styles/app.css';
import { createRoot } from 'react-dom/client';

const { Button, Badge, Card } = window.Springboard20DesignSystem_019e02;

function Smoke() {
  return (
    <div style={{ padding: 32, display: 'flex', gap: 16, alignItems: 'center' }}>
      <Button>Review contract</Button>
      <Badge>Smoke test</Badge>
      <i className="fa-solid fa-house" aria-hidden="true" />
      <Card style={{ padding: 16 }}>Card surface</Card>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<Smoke />);
