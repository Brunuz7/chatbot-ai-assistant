import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextArea } from '../components/ui/Input';
import api from '../services/api';
import { FileText, Save } from 'lucide-react';

export default function Instructions() {
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadInstruction() {
      try {
        const response = await api.get('/api/instructions');
        if (response.data) {
          setContent(response.data.content || '');
          setIsActive(Boolean(response.data.is_active));
        }
      } catch (error) {
        console.error('Erro ao carregar instrução:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInstruction();
  }, []);

  async function handleSave() {
    setMessage(null);
    setSaving(true);
    try {
      await api.put('/api/instructions', {
        content,
        is_active: isActive,
      });
      setMessage('Instrução salva com sucesso.');
    } catch (error: any) {
      const backendError = error?.response?.data?.error;
      if (backendError === 'invalid_input') {
        setMessage('Preencha a instrução antes de salvar.');
      } else {
        setMessage('Falha ao salvar instrução.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="animate-fade-in max-w-4xl space-y-6">
        <header>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Instrucoes Globais</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Defina uma unica instrucao aplicada a todas as mensagens geradas pela IA.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <FileText size={18} />
                Instrucao do Usuario
              </span>
            </CardTitle>
          </CardHeader>

          {loading ? (
            <p className="text-slate-500 dark:text-slate-400">Carregando...</p>
          ) : (
            <div className="space-y-4">
              <TextArea
                label="Instrucao"
                rows={8}
                placeholder="Ex: Sempre responder de forma objetiva e sem girias."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />

              <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ativar instrução global</span>
              </label>

              {message && (
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{message}</div>
              )}

              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar Instrucao'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
