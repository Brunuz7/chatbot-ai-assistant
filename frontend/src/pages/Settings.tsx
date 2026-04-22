import React from 'react';
import Layout from '../components/Layout';
import { Settings, Users, Shield, History, Bell, Database } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <Layout>
      <div className="animate-fade-in">
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Configurações</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie sua conta, equipe e preferências do sistema.</p>
        </header>

        <div className="grid grid-cols-1" style={{ gap: '2rem' }}>
          {/* General Section */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Settings size={20} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Geral</h2>
            </div>
            <div className="card">
              <div className="form-group">
                <label className="form-label">Nome da Empresa</label>
                <input type="text" className="form-input" defaultValue="Minha Empresa SaaS" />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail de Notificação</label>
                <input type="email" className="form-input" defaultValue="admin@empresa.com" />
              </div>
            </div>
          </section>

          {/* Team Section */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Users size={20} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Usuários e Permissões</h2>
            </div>
            <div className="card">
              <table style={{ marginBottom: '1.5rem' }}>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>E-mail</th>
                    <th>Cargo</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>João Administrador</strong></td>
                    <td>joao@empresa.com</td>
                    <td><span className="badge badge-success">Admin</span></td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>Editar</button></td>
                  </tr>
                  <tr>
                    <td>Maria Atendente</td>
                    <td>maria@empresa.com</td>
                    <td><span className="badge badge-warning">Atendente</span></td>
                    <td style={{ textAlign: 'right' }}><button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }}>Editar</button></td>
                  </tr>
                </tbody>
              </table>
              <button className="btn btn-outline" style={{ width: '100%' }}>Convidar Novo Usuário</button>
            </div>
          </section>

          {/* Logs Section */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <History size={20} style={{ color: 'var(--primary)' }} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Logs do Sistema</h2>
            </div>
            <div className="card" style={{ background: 'var(--background)' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <div style={{ marginBottom: '0.5rem' }}>[2024-04-21 16:20:45] <span style={{ color: 'var(--success)' }}>SUCCESS:</span> Conexão com Evolution API estabelecida.</div>
                <div style={{ marginBottom: '0.5rem' }}>[2024-04-21 16:15:12] <span style={{ color: 'var(--primary)' }}>INFO:</span> Webhook recebido de +5511999998888.</div>
                <div style={{ marginBottom: '0.5rem' }}>[2024-04-21 16:10:05] <span style={{ color: 'var(--warning)' }}>WARN:</span> Tentativa de login falha para admin@empresa.com.</div>
                <div>[2024-04-21 16:05:00] <span style={{ color: 'var(--primary)' }}>INFO:</span> Backup automático do banco de dados concluído.</div>
              </div>
            </div>
          </section>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn btn-outline">Cancelar</button>
          <button className="btn btn-primary">Salvar Alterações</button>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
