// Serverless function (Node) — Netlify
// Proxy a HeroesProfile y agrega el token secreto del lado servidor.

const API_BASE = 'https://api.heroesprofile.com/api';

// Pequeña utilidad para construir querystring
function toQS(obj = {}) {
    return Object.entries(obj)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
}

exports.handler = async function (event) {
    // CORS básico (ajusta el origen si quieres restringirlo)
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: cors };
    }

    try {
        const HP_TOKEN = process.env.HP_TOKEN; // ← define este secreto en Netlify
        if (!HP_TOKEN) {
            return { statusCode: 500, headers: cors, body: 'Missing HP_TOKEN env var' };
        }

        // Permite pasar filtros desde el front (hero, role, etc.)
        const params = {
            mode: 'json',
            api_token: HP_TOKEN,
            ...event.queryStringParameters,
        };

        const upstream = `${API_BASE}/Heroes?${toQS(params)}`;
        const res = await fetch(upstream);
        if (!res.ok) {
            return { statusCode: res.status, headers: cors, body: `Upstream error ${res.status}` };
        }
        const data = await res.text(); // devuelve tal cual
        return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: data };
    } catch (err) {
        return { statusCode: 500, headers: cors, body: String(err) };
    }
};
