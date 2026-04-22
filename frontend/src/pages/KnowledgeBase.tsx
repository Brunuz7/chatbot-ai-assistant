import React, { useState } from 'react';
import Layout from '../components/Layout';
import { BookOpen, Plus, Search, FileText, Tag, MoreVertical } from 'lucide-react';

const KnowledgeBase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items] = useState([
    { id: 1, title: 'Política de Reembolso', category: 'Financeiro', updatedAt: '2h atrás' },
    { id: 2, title: 'Horário de Atendimento', category: 'Geral', updatedAt: '1 dia atrás' },
    { id: 3, title: 'Como resetar senha', category: 'Suporte Técnico', updatedAt: '3 dias atrás' },
    { id: 4, title: 'Planos e Preços 2024', category: 'Vendas', updatedAt: '5 dias atrás' },
  ]);

  return (
    <Layout>
      <div className="animate-fade-in">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Base de Conhecimento</h1>
            <p style={{ color: 'var(--text-muted)' }}>Treine sua IA com informações específicas da sua empresa.</p>
          </div>
          <button className="btn btn-primary">
            <Plus size={20} /> Adicionar Conteúdo
          </button>
        </header>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <input 
              type="text" 
              placeholder="Buscar conteúdos..." 
              className="form-input" 
              style={{ paddingLeft: '3rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1">
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Categoria</th>
                  <th>Última Atualização</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ color: 'var(--primary)' }}><FileText size={18} /></div>
                        <span style={{ fontWeight: 600 }}>{item.title}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--background)', color: 'var(--text)' }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.updatedAt}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-outline" style={{ padding: '0.4rem' }}>
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default KnowledgeBase;
