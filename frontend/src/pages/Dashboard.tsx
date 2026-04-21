import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/api/auth/protected')
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.error || 'failed'));
  }, []);

  return (
    <div>
      <h2>Painel</h2>
      {error && <div className="error">{error}</div>}
      {data && (
        <div>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
