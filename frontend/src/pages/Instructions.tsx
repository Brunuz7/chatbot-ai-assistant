import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import Layout from '../components/Layout';
import { PageHeader } from '../components/PageHeader';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextArea } from '../components/ui/Input';
import { FloatingDock } from '../components/ui/FloatingDock';
import api from '../services/api';
import { FileText, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../utils/apiError';
import { FLOATING_ACTION_SCROLL_CLEARANCE } from '../lib/floatingActionLayout';

export default function Instructions() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadInstruction() {
      try {
        const response = await api.get('/api/instructions');
        if (response.data) {
          setContent(response.data.content || '');
        }
      } catch (error) {
        console.error(error);
        toast.error(getApiErrorMessage(error, 'Não foi possível carregar a instrução.'));
      } finally {
        setLoading(false);
      }
    }

    loadInstruction();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/api/instructions', {
        content,
        is_active: true,
      });
      toast.success('Instrução salva com sucesso.');
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data && typeof error.response.data === 'object') {
        const errCode = (error.response.data as { error?: string }).error;
        if (errCode === 'invalid_input') {
          toast.error('Preencha a instrução antes de salvar.');
          return;
        }
      }
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar a instrução.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className={`relative mx-auto max-w-4xl animate-fade-in ${FLOATING_ACTION_SCROLL_CLEARANCE}`}>
        <PageHeader
          icon={FileText}
          title="Instruções globais"
          subtitle="Um texto único aplicado a todas as respostas geradas pela IA."
        />

        <Card className="p-4 sm:p-6">
          <CardHeader className="mb-3 sm:mb-4">
            <CardTitle>
              <span className="text-base font-semibold sm:text-lg">Texto da instrução</span>
            </CardTitle>
          </CardHeader>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
              Carregando…
            </div>
          ) : (
            <TextArea
              label="Conteúdo"
              rows={10}
              className="min-h-[200px] sm:min-h-[260px]"
              placeholder="Ex.: Responder de forma objetiva, em tom profissional e sem gírias."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          )}
        </Card>

        <FloatingDock visible={!loading}>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="h-12 min-w-[11rem] sm:h-11"
          >
            {saving ? (
              <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Save className="size-5 shrink-0 sm:size-[18px]" aria-hidden />
            )}
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </FloatingDock>
      </div>
    </Layout>
  );
}
