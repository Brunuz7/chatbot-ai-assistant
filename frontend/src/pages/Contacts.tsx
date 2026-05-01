import React, { useState } from 'react';
import Layout from '../components/Layout';
import { Users, Search, Filter, MessageCircle, MoreVertical, Phone, User } from 'lucide-react';
import { DataList } from '../components/ui/DataList';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { Select } from '../components/ui/Input';

const Contacts: React.FC = () => {
  const [contacts] = useState([
    { id: '1', name: 'João Silva', number: '+55 11 99999-8888', tags: ['Vip', 'Lead'], lastInteraction: '15 min atrás' },
    { id: '2', name: 'Maria Souza', number: '+55 21 98888-7777', tags: ['Suporte'], lastInteraction: '1h atrás' },
    { id: '3', name: 'Pedro Santos', number: '+55 31 97777-6666', tags: ['Vendas'], lastInteraction: 'Ontem' },
    { id: '4', name: 'Ana Oliveira', number: '+55 41 96666-5555', tags: ['Financeiro'], lastInteraction: '2 dias atrás' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         contact.number.includes(searchTerm);
    const matchesTag = tagFilter === '' || contact.tags.includes(tagFilter);
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags)));

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <Users size={32} className="text-primary" />
              Contatos
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie os leads e clientes que interagiram com seu assistente.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="primary">
              Exportar CSV
            </Button>
          </div>
        </header>

        <FilterBar
          onSearch={setSearchTerm}
          searchValue={searchTerm}
          searchPlaceholder="Buscar por nome ou número..."
          activeFiltersCount={tagFilter !== '' ? 1 : 0}
          onClear={() => {
            setSearchTerm('');
            setTagFilter('');
          }}
        >
          <div className="w-full">
            <Select 
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="">Todas as Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </Select>
          </div>
        </FilterBar>

        <DataList
          data={filteredContacts}
          columns={[
            { 
              header: 'Nome', 
              accessor: (contact) => (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">{contact.name}</span>
                </div>
              )
            },
            { 
              header: 'Número', 
              accessor: (contact) => (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Phone size={14} />
                  {contact.number}
                </div>
              )
            },
            { 
              header: 'Tags', 
              accessor: (contact) => (
                <div className="flex gap-1.5 flex-wrap">
                  {contact.tags.map(tag => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>
              )
            },
            { header: 'Última Interação', accessor: 'lastInteraction', className: 'text-slate-500' },
            { 
              header: 'Ações', 
              accessor: () => (
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm">
                    <MessageCircle size={16} />
                  </Button>
                  <Button variant="outline" size="sm">
                    <MoreVertical size={16} />
                  </Button>
                </div>
              ),
              className: 'text-right'
            }
          ]}
          renderCard={(contact) => (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20">
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{contact.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <Phone size={12} />
                      {contact.number}
                    </div>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <MoreVertical size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {contact.tags.map(tag => (
                  <Badge key={tag} variant="default">{tag}</Badge>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{contact.lastInteraction}</span>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageCircle size={14} /> Conversar
                </Button>
              </div>
            </div>
          )}
        />
      </div>
    </Layout>
  );
};

export default Contacts;
