import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Users, Search, Filter, MessageCircle, MoreVertical, Phone } from 'lucide-react';

const Contacts: React.FC = () => {
  const [contacts] = useState([
    { id: 1, name: 'João Silva', number: '+55 11 99999-8888', tags: ['Vip', 'Lead'], lastInteraction: '15 min atrás' },
    { id: 2, name: 'Maria Souza', number: '+55 21 98888-7777', tags: ['Suporte'], lastInteraction: '1h atrás' },
    { id: 3, name: 'Pedro Santos', number: '+55 31 97777-6666', tags: ['Vendas'], lastInteraction: 'Ontem' },
    { id: 4, name: 'Ana Oliveira', number: '+55 41 96666-5555', tags: ['Financeiro'], lastInteraction: '2 dias atrás' },
  ]);

  return (
    <Layout>
      <div className="animate-fade-in">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Contatos</h1>
            <p style={{ color: 'var(--text-muted)' }}>Gerencie os leads e clientes que interagiram com seu assistente.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline">
              <Filter size={18} /> Filtros
            </button>
            <button className="btn btn-primary">
              Exportar CSV
            </button>
          </div>
        </header>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou número..." 
              className="form-input" 
              style={{ paddingLeft: '3rem' }}
            />
          </div>
        </div>

        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Número</th>
                <th>Tags</th>
                <th>Última Interação</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: '0.75rem' }}>
                        {contact.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span style={{ fontWeight: 600 }}>{contact.name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <Phone size={14} />
                      {contact.number}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {contact.tags.map(tag => (
                        <span key={tag} className="badge" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{contact.lastInteraction}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline" style={{ padding: '0.4rem' }}>
                        <MessageCircle size={16} />
                      </button>
                      <button className="btn btn-outline" style={{ padding: '0.4rem' }}>
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Contacts;
