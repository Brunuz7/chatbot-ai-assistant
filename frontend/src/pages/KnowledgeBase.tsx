import React, { useState } from 'react';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { BookOpen, Plus, Search, FileText, Edit, Trash2 } from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { Select } from '../components/ui/Input';

const KnowledgeBase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [items] = useState([
    { id: '1', title: 'Política de Reembolso', category: 'Financeiro', updatedAt: '2h atrás' },
    { id: '2', title: 'Horário de Atendimento', category: 'Geral', updatedAt: '1 dia atrás' },
    { id: '3', title: 'Como resetar senha', category: 'Suporte Técnico', updatedAt: '3 dias atrás' },
    { id: '4', title: 'Planos e Preços 2024', category: 'Vendas', updatedAt: '5 dias atrás' },
  ]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === '' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(items.map(i => i.category)));

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          icon={BookOpen}
          title="Base de conhecimento"
          subtitle="Documentos e textos que a IA pode consultar nas respostas."
          actions={
            <Button variant="primary" className="h-11 w-full gap-2 sm:h-auto sm:w-auto">
              <Plus size={20} aria-hidden /> Adicionar conteúdo
            </Button>
          }
        />

        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar conteúdos..."
          activeFiltersCount={categoryFilter !== '' ? 1 : 0}
          onClear={() => {
            setSearchTerm('');
            setCategoryFilter('');
          }}
        >
          <div className="w-full">
            <Select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Todas as Categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>
        </FilterBar>

        <DataList
          data={filteredItems}
          columns={[
            { 
              header: 'Título', 
              accessor: (item) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{item.title}</span>
                </div>
              )
            },
            { 
              header: 'Categoria', 
              accessor: (item) => (
                <Badge variant="default">{item.category}</Badge>
              )
            },
            { header: 'Última Atualização', accessor: 'updatedAt', className: 'text-slate-500' },
            { 
              header: 'Ações', 
              accessor: () => (
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm">
                    <Edit size={16} />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:border-red-200">
                    <Trash2 size={16} />
                  </Button>
                </div>
              ),
              className: 'text-right'
            }
          ]}
          renderCard={(item) => (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all h-full flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400">
                  <FileText size={24} />
                </div>
                <Badge variant="default">{item.category}</Badge>
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2">{item.title}</h3>
              <div className="flex-1"></div>
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-50 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{item.updatedAt}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm">
                    <Edit size={14} />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </Layout>
  );
};

export default KnowledgeBase;
