import React from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Settings, Users, Shield, History, Save, Trash2, Edit2, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';

const SettingsPage: React.FC = () => {
  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <PageHeader
          icon={Settings}
          title="Configurações"
          subtitle="Conta, equipa e preferências da aplicação."
        />

        <div className="grid grid-cols-1 gap-8">
          {/* General Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings size={20} className="text-primary" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Geral</h2>
            </div>
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="Nome da Empresa" 
                  defaultValue="Minha Empresa SaaS" 
                />
                <Input 
                  label="E-mail de Notificação" 
                  type="email" 
                  defaultValue="admin@empresa.com" 
                />
              </div>
            </Card>
          </section>

          {/* Team Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-primary" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Usuários e Permissões</h2>
              </div>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus size={16} /> Convidar
              </Button>
            </div>
            <Table 
              data={[
                { id: 1, name: 'João Administrador', email: 'joao@empresa.com', role: 'Admin' },
                { id: 2, name: 'Maria Atendente', email: 'maria@empresa.com', role: 'Atendente' },
              ]}
              columns={[
                { 
                  header: 'Usuário', 
                  accessor: (u) => <span className="font-bold">{u.name}</span> 
                },
                { header: 'E-mail', accessor: 'email' },
                { 
                  header: 'Cargo', 
                  accessor: (u: any) => (
                    <Badge variant={u.role === 'Admin' ? 'success' : 'warning'}>
                      {u.role}
                    </Badge>
                  ) 
                },
                { 
                  header: 'Ações', 
                  accessor: () => (
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm">
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-500">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ),
                  className: 'text-right'
                }
              ]}
            />
          </section>

          {/* Logs Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <History size={20} className="text-primary" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Logs do Sistema</h2>
            </div>
            <Card className="bg-slate-50 dark:bg-slate-900/50">
              <div className="font-mono text-xs space-y-2 text-slate-600 dark:text-slate-400">
                <div>[2024-04-21 16:20:45] <span className="text-emerald-500 font-bold">SUCCESS:</span> Conexão com Evolution API estabelecida.</div>
                <div>[2024-04-21 16:15:12] <span className="text-primary font-bold">INFO:</span> Webhook recebido de +5511999998888.</div>
                <div>[2024-04-21 16:10:05] <span className="text-amber-500 font-bold">WARN:</span> Tentativa de login falha para admin@empresa.com.</div>
                <div>[2024-04-21 16:05:00] <span className="text-primary font-bold">INFO:</span> Backup automático do banco de dados concluído.</div>
              </div>
            </Card>
          </section>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline">Cancelar</Button>
          <Button variant="primary" className="gap-2">
            <Save size={18} /> Salvar Alterações
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
