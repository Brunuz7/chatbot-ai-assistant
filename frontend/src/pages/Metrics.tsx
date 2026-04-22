import React from 'react';
import Layout from '../components/Layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { Calendar, Download, Info } from 'lucide-react';

const activityData = [
  { name: '08:00', total: 120, auto: 100 },
  { name: '10:00', total: 250, auto: 210 },
  { name: '12:00', total: 400, auto: 340 },
  { name: '14:00', total: 380, auto: 330 },
  { name: '16:00', total: 520, auto: 450 },
  { name: '18:00', total: 300, auto: 260 },
  { name: '20:00', total: 150, auto: 130 },
];

const resolutionData = [
  { name: 'Resolvido IA', value: 85, color: 'var(--primary)' },
  { name: 'Transf. Humano', value: 10, color: 'var(--warning)' },
  { name: 'Abandonado', value: 5, color: 'var(--danger)' },
];

const Metrics: React.FC = () => {
  return (
    <Layout>
      <div className="animate-fade-in">
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Métricas e Analíticos</h1>
            <p style={{ color: 'var(--text-muted)' }}>Acompanhe o desempenho do seu assistente em tempo real.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline">
              <Calendar size={18} /> Últimos 7 dias
            </button>
            <button className="btn btn-primary">
              <Download size={18} /> Exportar
            </button>
          </div>
        </header>

        <div className="grid grid-cols-3" style={{ marginBottom: '2rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Taxa de Assertividade</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>94.2%</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+2.1% em relação ao período anterior</p>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Economia Estimada</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>R$ 4.250</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseado em 1.240 horas automatizadas</p>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Satisfação (CSAT)</h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)' }}>4.8/5</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Média de 450 avaliações</p>
          </div>
        </div>

        <div className="grid grid-cols-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Volume de Mensagens</h3>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="var(--primary)" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={3} />
                  <Area type="monotone" dataKey="auto" stroke="var(--success)" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }}></div> Total
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></div> Automatizadas
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Distribuição de Resolução</h3>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={resolutionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {resolutionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {resolutionData.map(item => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '2px', background: item.color }}></div>
                    {item.name}
                  </div>
                  <span style={{ fontWeight: 600 }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Metrics;
