import { FormRecuperar } from './FormRecuperar';

export default function Recuperar() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Recuperar clave</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>Le enviaremos su usuario y un código para crear una nueva clave</p>
        <FormRecuperar />
      </div>
    </div>
  );
}
