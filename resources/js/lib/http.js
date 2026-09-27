function xsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export async function postJson(url, body, { signal } = {}) {
    const res = await fetch(url, {
        method: 'POST',
        signal,
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
        },
        body: JSON.stringify(body),
    });
    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
    if (!res.ok) {
        const error = new Error(`HTTP ${res.status}`);
        error.response = { status: res.status, data };
        throw error;
    }
    return { data, status: res.status };
}

export async function getJson(url, { signal } = {}) {
    const res = await fetch(url, {
        signal,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    });
    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
    if (!res.ok) {
        const error = new Error(`HTTP ${res.status}`);
        error.response = { status: res.status, data };
        throw error;
    }
    return { data, status: res.status };
}
