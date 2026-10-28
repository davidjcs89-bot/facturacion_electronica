import { FormLogin } from './FormLogin';

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Facturación Electrónica</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>Ingrese con su usuario y clave</p>
        <FormLogin />
      </div>
    </div>
  );
}
