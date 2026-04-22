import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Zap, Plus, Play, Pause, Trash2, Edit2 } from 'lucide-react';

const Automations: React.FC = () => {
  const [automations] = useState([
    { id: 1, name: 'Boas-vindas', trigger: 'Nova conversa', actions: 3, status: 'active' },
    { id: 2, name: 'Fora de Horário', trigger: 'Mensagem recebida', actions: 2, status: 'active' },
    { id: 3, name: 'Qualificação Lead', trigger: 'Palavra-chave: "preço"', actions: 5, status: 'inactive' },
  ]);

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Fluxos de Automação</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Crie respostas automáticas e fluxos inteligentes.</p>
          </div>
          <Button>
            <Plus size={20} /> Novo Fluxo
          </Button>
        </header>

        <Card className="overflow-hidden p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Gatilho</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Gerenciar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {automations.map((auto) => (
                <tr key={auto.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{auto.name}</td>
                  <td className="px-6 py-4">
                    <Badge variant="default">{auto.trigger}</Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{auto.actions} etapas</td>
                  <td className="px-6 py-4">
                    <Badge variant={auto.status === 'active' ? 'success' : 'danger'}>
                      {auto.status === 'active' ? 'Ativo' : 'Pausado'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm">
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="outline" size="sm">
                        {auto.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-500 hover:border-red-200">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {automations.length === 0 && (
          <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-full w-fit mx-auto shadow-sm mb-4">
              <Zap size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nenhum fluxo criado</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto">Comece criando sua primeira automação para economizar tempo.</p>
            <Button>Criar Primeiro Fluxo</Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Automations;
