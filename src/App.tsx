import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [controlUrl, setControlUrl] = useState<string | null>(null);
  const [pautaUrl, setPautaUrl] = useState<string | null>(null);
  const [uploadingControl, setUploadingControl] = useState(false);
  const [uploadingPauta, setUploadingPauta] = useState(false);

  // ── Auth listener ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Cargar últimos archivos del usuario ──
  useEffect(() => {
    if (!user) return;

    const loadLatestFiles = async () => {
      const { data, error } = await supabase.storage
        .from('nutricion-docs')
        .list(user.id, { sortBy: { column: 'created_at', order: 'desc' } });

      if (error || !data) return;

      const lastControl = data.find(f => f.name.includes('_control.'));
      const lastPauta = data.find(f => f.name.includes('_pauta.'));

      if (lastControl) {
        const { data: urlData } = supabase.storage
          .from('nutricion-docs')
          .getPublicUrl(`${user.id}/${lastControl.name}`);
        setControlUrl(urlData.publicUrl);
      }

      if (lastPauta) {
        const { data: urlData } = supabase.storage
          .from('nutricion-docs')
          .getPublicUrl(`${user.id}/${lastPauta.name}`);
        setPautaUrl(urlData.publicUrl);
      }
    };

    loadLatestFiles();
  }, [user]);

  // ── Login con Google ──
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    });
  };

  // ── Logout ──
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setControlUrl(null);
    setPautaUrl(null);
  };

  // ── Upload de archivos ──
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    tipo: 'control' | 'pauta'
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const setUploading = tipo === 'control' ? setUploadingControl : setUploadingPauta;

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      // Guardar en carpeta del usuario: /{user_id}/{timestamp}_{tipo}.pdf
      const fileName = `${user.id}/${Date.now()}_${tipo}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('nutricion-docs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('nutricion-docs')
        .getPublicUrl(fileName);

      if (tipo === 'control') {
        setControlUrl(data.publicUrl);
      } else {
        setPautaUrl(data.publicUrl);
      }

      alert('¡Archivo subido con éxito!');
    } catch (error: any) {
      console.error('Error detallado:', error);
      alert('Error al subir: ' + (error.message || 'Verifica las políticas de Supabase'));
    } finally {
      setUploading(false);
    }
  };

  // ── Loading inicial ──
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Cargando...</div>
        </div>
      </div>
    );
  }

  // ── Pantalla de Login ──
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg, #7c2d12, #ea580c)', fontFamily: 'sans-serif', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>💪</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Bienvenido a
          </div>
          <div style={{ color: '#fff', fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            Mamadisimo App
          </div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.6, marginBottom: 40 }}>
            Gestión de nutrición y seguimiento personalizado.
          </div>
          <button
            onClick={handleLogin}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '16px 24px', background: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#1f2937', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
          >
            <svg width="22" height="22" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continuar con Google
          </button>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 24, lineHeight: 1.6 }}>
            Tus archivos son privados y solo tú puedes acceder a ellos.
          </div>
        </div>
      </div>
    );
  }

  // ── App principal (usuario autenticado) ──
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'sans-serif', margin: 0 }}>

      {/* Encabezado */}
      <header style={{ backgroundColor: '#ea580c', color: 'white', padding: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>💪 Mamadisimo App</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="avatar"
                style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)' }}
              />
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {user.user_metadata?.full_name || user.email}
              </div>
              <button
                onClick={handleLogout}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <section style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', border: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '25px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📋 Mi Seguimiento Nutricional
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

            {/* Evaluación y Control */}
            <div style={{ padding: '20px', backgroundColor: '#fff7ed', borderRadius: '15px', border: '1px solid #ffedd5' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#9a3412' }}>Evaluación y Control</h3>
              <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '20px' }}>
                Sube tus informes antropométricos o de progreso.
              </p>
              <label style={{
                display: 'block', padding: '12px',
                backgroundColor: uploadingControl ? '#9ca3af' : '#ea580c',
                color: 'white', textAlign: 'center', borderRadius: '10px', fontWeight: 'bold',
                cursor: uploadingControl ? 'default' : 'pointer', transition: 'background-color 0.2s'
              }}>
                {uploadingControl ? '⏳ Subiendo...' : '📤 Subir Control (PDF)'}
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e, 'control')}
                  disabled={uploadingControl}
                />
              </label>
              {controlUrl && (
                <a href={controlUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '15px', color: '#c2410c', fontSize: '14px', textAlign: 'center', fontWeight: '500' }}>
                  🔗 Ver último control subido
                </a>
              )}
            </div>

            {/* Plan Alimenticio */}
            <div style={{ padding: '20px', backgroundColor: '#eff6ff', borderRadius: '15px', border: '1px solid #dbeafe' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>Plan Alimenticio</h3>
              <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '20px' }}>
                Ten siempre a mano tu dieta personalizada.
              </p>
              <label style={{
                display: 'block', padding: '12px',
                backgroundColor: uploadingPauta ? '#9ca3af' : '#2563eb',
                color: 'white', textAlign: 'center', borderRadius: '10px', fontWeight: 'bold',
                cursor: uploadingPauta ? 'default' : 'pointer', transition: 'background-color 0.2s'
              }}>
                {uploadingPauta ? '⏳ Subiendo...' : '📤 Subir Nueva Pauta'}
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e, 'pauta')}
                  disabled={uploadingPauta}
                />
              </label>
              {pautaUrl && (
                <a href={pautaUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: '15px', color: '#1d4ed8', fontSize: '14px', textAlign: 'center', fontWeight: '500' }}>
                  🔗 Ver pauta de alimentación
                </a>
              )}
            </div>

          </div>
        </section>
      </main>

      <footer style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: '12px' }}>
        <p>© 2026 Mamadisimo App - Gestión de Nutrición</p>
      </footer>
    </div>
  );
}

export default App;
