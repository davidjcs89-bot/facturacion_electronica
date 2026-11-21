/**
 * Graba la respuesta hablada en el celular (funciona en iPhone y Android) y se detiene sola
 * cuando la persona deja de hablar. El audio se envía a /api/voz/transcribir.
 */
export type OpcionesGrabadora = {
  onFin(audio: Blob): void;
  /** no se escuchó a nadie */
  onNada(): void;
  onError(mensaje: string, denegado: boolean): void;
  /** nivel de voz 0..1 para la animación */
  onNivel?(n: number): void;
};

type ConAudioViejo = Window & { webkitAudioContext?: typeof AudioContext };

export function grabacionSoportada() {
  return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

export class Grabadora {
  private stream?: MediaStream;
  private rec?: MediaRecorder;
  private ctx?: AudioContext;
  private chunks: Blob[] = [];
  private timer?: number;
  private cancelado = false;
  private hablo = false;

  constructor(private o: OpcionesGrabadora) {}

  /** Llamar dentro de un toque del usuario (el iPhone lo exige). */
  async iniciar(): Promise<boolean> {
    // el AudioContext se crea antes del await para que quede ligado al toque
    const AC = window.AudioContext ?? (window as ConAudioViejo).webkitAudioContext;
    try { this.ctx = AC ? new AC() : undefined; } catch { this.ctx = undefined; }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      this.limpiar();
      const denegado = (e as Error).name === 'NotAllowedError' || (e as Error).name === 'SecurityError';
      this.o.onError(denegado ? 'El micrófono está bloqueado para esta página.' : 'El micrófono no está disponible.', denegado);
      return false;
    }
    if (this.cancelado) { this.limpiar(); return false; }
    const tipos = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
    const mime = tipos.find((t) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(t));
    try {
      this.rec = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    } catch {
      this.limpiar();
      this.o.onError('Este navegador no puede grabar audio.', false);
      return false;
    }
    const rec = this.rec;
    rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    rec.onstop = () => {
      const audio = new Blob(this.chunks, { type: rec.mimeType || mime || 'audio/webm' });
      const hablo = this.hablo;
      this.limpiar();
      if (this.cancelado) return;
      if (!hablo || audio.size < 1500) this.o.onNada(); else this.o.onFin(audio);
    };
    rec.start(250);
    this.vigilar();
    return true;
  }

  /** Detecta el silencio: termina 1,5 s después de que la persona deja de hablar */
  private vigilar() {
    const inicio = Date.now();
    let ultimoSonido = inicio;
    let piso = 0, muestrasPiso = 0;
    let analizador: AnalyserNode | undefined;
    let datos: Uint8Array<ArrayBuffer> | undefined;
    try {
      if (this.ctx && this.stream) {
        void this.ctx.resume();
        const src = this.ctx.createMediaStreamSource(this.stream);
        analizador = this.ctx.createAnalyser();
        analizador.fftSize = 1024;
        src.connect(analizador);
        datos = new Uint8Array(new ArrayBuffer(analizador.fftSize));
      }
    } catch { analizador = undefined; }

    const paso = () => {
      if (!this.rec || this.rec.state !== 'recording') return;
      const ahora = Date.now();
      if (analizador && datos) {
        analizador.getByteTimeDomainData(datos);
        let s = 0;
        for (let i = 0; i < datos.length; i++) { const x = (datos[i] - 128) / 128; s += x * x; }
        const rms = Math.sqrt(s / datos.length);
        this.o.onNivel?.(Math.min(1, rms * 6));
        if (ahora - inicio < 400) { piso += rms; muestrasPiso++; } // ruido del lugar
        const umbral = Math.max(0.02, (muestrasPiso ? piso / muestrasPiso : 0) * 2.5);
        if (ahora - inicio >= 400 && rms > umbral) { ultimoSonido = ahora; this.hablo = true; }
        if (this.hablo && ahora - ultimoSonido > 1500) { this.terminar(); return; }
        if (!this.hablo && ahora - inicio > 8000) { this.terminar(); return; }
      } else {
        this.hablo = true; // sin medidor: termina con el botón «Listo»
      }
      if (ahora - inicio > 30000) { this.terminar(); return; }
      this.timer = window.setTimeout(paso, 100);
    };
    paso();
  }

  /** Termina y entrega lo grabado */
  terminar() {
    if (this.rec && this.rec.state === 'recording') this.rec.stop();
    else if (!this.rec) this.limpiar();
  }

  /** Termina sin entregar nada */
  cancelar() {
    this.cancelado = true;
    this.terminar();
    this.limpiar();
  }

  private limpiar() {
    if (this.timer) clearTimeout(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    try { void this.ctx?.close(); } catch { /* */ }
    this.ctx = undefined;
  }
}
