import { useEffect, useState } from "react";
import api from "../services/api";

interface blockedContact {
    id: string;
    phoneNumber: string;
    observation: string;
    blocketTime: string;
}


export default function BlockedContacts() {
    const [contacts, setContacts] = useState<blockedContact[]>([]);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [observation, setObservation] = useState("");

    async function loadContacts() {
        try {
            const res = await api.get("/api/blocked");

            setContacts(res.data);
        } catch (error: any) {
            console.error("Erro ao carregar contatos:", error.response?.data || error);
        }
    }

    async function handleBlock() {
        // limpa tudo que não for número
        const cleanNumber = phoneNumber.replace(/\D/g, "");

        // campo vazio
        if (!cleanNumber) {
            alert("Digite um número.");
            return;
        }

        // mínimo 10 dígitos
        if (cleanNumber.length < 10) {
            alert("Digite um telefone válido.");
            return;
        }

        try {
            await api.post(
                "/api/blocked",
                {
                    phoneNumber: cleanNumber,
                    observation,
                },
            );

            setPhoneNumber("");
            setObservation("");

            loadContacts();
        } catch (error: any) {
            console.error(
                "Erro ao bloquear:",
                error.response?.data || error
            );
        }
    }


    async function handleUnblock(item: blockedContact) {
        try {
            await api.delete(`/api/blocked/${item.id}`);

            loadContacts();

        } catch (error: any) {
            console.error("Erro ao desbloquear:", error.response?.data || error);
        }
    }

    useEffect(() => {
        loadContacts();
    }, []);

    return (
        <div className="min-h-screen bg-[#020817] text-white p-8">
            <h1 className="text-5xl font-bold mb-8">
                Contatos bloqueados
            </h1>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-6 shadow-xl mb-10">
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={15}
                    value={phoneNumber}
                    onChange={(e) =>
                        setPhoneNumber(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Digite o número"
                    className="w-full bg-transparent border border-blue-500 rounded-xl px-4 py-2 text-white text outline-none mb-6"
                />
                <input
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Observation (optional)"
                    className="w-full bg-transparent border border-blue-500 rounded-xl px-4 py-2 text-white text outline-none mb-6"

                />
                <button
                    onClick={handleBlock}
                    className="bg-red-500 hover:bg-red-600 px-8 py-2 rounded-xl text font-semibold transition"
                >
                    🚫 Bloquear contato
                </button>
            </div>

            <div className="bg-white/1 border border-white/10 rounded-2xl overflow-hidden shadow-xl">

                <table className="w-full order-collapse">

                    <thead className="bg-white/10 text-gray-300">
                        <tr>
                            <th className="p-5 text-left">Número de telefone</th>
                            <th className="p-5 text-left">Observação</th>
                            <th className="p-5 text-left">Tempo bloqueado</th>
                            <th className="p-5 text-left">Ações</th>
                        </tr>
                    </thead>

                    <tbody>
                        {contacts.map((item, index) => (
                            <tr
                                key={item.id}
                                className="border-t border-white/10 hover:bg-white/5 transition"
                            >
                                <td
                                    className={`p-4 ${index === contacts.length - 1 ? "rounded-bl-2xl" : ""
                                        }`}
                                >
                                    {item.phoneNumber}
                                </td>

                                <td className="p-4">{item.observation || "-"}</td>

                                <td className="p-4">
                                    {new Date(item.blockedTime).toLocaleString()}
                                </td>

                                <td
                                    className={`p-4 ${index === contacts.length - 1 ? "rounded-br-2xl" : ""
                                        }`}
                                >
                                    <button
                                        onClick={() => handleUnblock(item)}
                                        className="bg-green-500 hover:bg-green-600 px-5 py-2 rounded-xl font-medium transition"
                                    >
                                        Desbloquear
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>

                </table>


            </div>
        </div>
    )
}